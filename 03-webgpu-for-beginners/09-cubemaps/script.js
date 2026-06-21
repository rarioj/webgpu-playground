import { initGPU, makeShaderModule, makeImagesTexture, makeDepthStencilSettings } from "./library/helper/webgpu.js";
import { loadResources, parseObjCode } from "./library/helper/utility.js";
import { resourceArray, vertexMap } from "./config.js";
import { FirstPersonCamera } from "./library/component/FirstPersonCamera.js";
import { Scene } from "./Scene.js";
import { BasicMesh } from "./library/component/BasicMesh.js";

const canvas = document.querySelector("canvas");
const { device, context } = await initGPU({ canvas });
const resources = await loadResources(resourceArray);
const cubemapModule = makeShaderModule(device, resources.cubemap);
const shaderModule = makeShaderModule(device, resources.shader);
const {
  texture: cubemapTexture,
  view: cubemapView,
  sampler: cubemapSampler,
} = await makeImagesTexture(
  context,
  [resources.cubemap_px, resources.cubemap_nx, resources.cubemap_py, resources.cubemap_ny, resources.cubemap_pz, resources.cubemap_nz],
  {
    viewDescriptor: { dimension: "cube" },
  },
);
const {
  texture: imageTexture,
  view: imageView,
  sampler: imageSampler,
  bindGroupLayout: fragmentBindGroupLayout,
  bindGroup: fragmentBindGroup,
} = await makeImagesTexture(context, resources.image, { createBindGroup: true });

// --- Set up camera and scene
const camera = new FirstPersonCamera(
  {
    aspect: canvas.width / canvas.height,
    far: 100,
  },
  {
    pointerLockElement: canvas,
    debugKeyPress: document.getElementById("event-keypress"),
    debugMouseMove: document.getElementById("event-mousemove"),
  },
);
camera.position = [-7, -0.5, 0.5];
const scene = new Scene();

// --- Set up triangle, quad, and obj meshes
const triangle = new BasicMesh(device, vertexMap.triangle);
const quad = new BasicMesh(device, vertexMap.quad);
const objmesh = new BasicMesh(device, parseObjCode(resources.model));

// --- Set up uniform buffer
const cameraBuffer = device.createBuffer({
  size: 16 * 3, // 4 bytes * 3 types (forward, right, up)
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const uniformBuffer = device.createBuffer({
  size: 64 * 2, // 4x4 matrix * 2 types (projection, view)
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const objectBuffer = device.createBuffer({
  size: 64 * 1024,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

// --- Set up depth stencil
const { depthStencil, depthStencilTexture, depthStencilView, depthStencilAttachment } = makeDepthStencilSettings(context);

// --- Set up bind groups layouts
const cubemapBindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: {
        type: "uniform",
      },
    },
    {
      binding: 1,
      visibility: GPUShaderStage.FRAGMENT,
      texture: {
        viewDimension: "cube",
      },
    },
    {
      binding: 2,
      visibility: GPUShaderStage.FRAGMENT,
      sampler: {},
    },
  ],
});
const vertexBindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: {},
    },
    {
      binding: 1,
      visibility: GPUShaderStage.VERTEX,
      buffer: {
        type: "read-only-storage",
        hasDynamicOffset: false,
      },
    },
  ],
});

// --- Set up bind groups
const cubemapBindGroup = device.createBindGroup({
  layout: cubemapBindGroupLayout,
  entries: [
    {
      binding: 0,
      resource: {
        buffer: cameraBuffer,
      },
    },
    {
      binding: 1,
      resource: cubemapView,
    },
    {
      binding: 2,
      resource: cubemapSampler,
    },
  ],
});
const vertexBindGroup = device.createBindGroup({
  layout: vertexBindGroupLayout,
  entries: [
    {
      binding: 0,
      resource: {
        buffer: uniformBuffer,
      },
    },
    {
      binding: 1,
      resource: {
        buffer: objectBuffer,
      },
    },
  ],
});

// --- Set up pipelines and layouts
const cubemapPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [cubemapBindGroupLayout] });
const cubemapPipeline = device.createRenderPipeline({
  layout: cubemapPipelineLayout,
  vertex: {
    module: cubemapModule,
    entryPoint: "skyVertexMain",
  },
  fragment: {
    module: cubemapModule,
    entryPoint: "skyFragmentMain",
    targets: [{ format: context.getConfiguration().format }],
  },
  primitive: {
    topology: "triangle-list",
  },
  depthStencil,
});
const standardPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [vertexBindGroupLayout, fragmentBindGroupLayout] });
const standardPipeline = device.createRenderPipeline({
  layout: standardPipelineLayout,
  vertex: {
    module: shaderModule,
    entryPoint: "vertexMain",
    buffers: [triangle.bufferLayout],
  },
  fragment: {
    module: shaderModule,
    entryPoint: "fragmentMain",
    targets: [{ format: context.getConfiguration().format }],
  },
  primitive: {
    topology: "triangle-list",
  },
  depthStencil,
});

const dy = Math.tan(Math.PI / 8);
const dx = (dy * canvas.width) / canvas.height;

function render() {
  scene.update();
  camera.update();

  const cameraData = new Float32Array([
    camera.forward[0],
    camera.forward[1],
    camera.forward[2],
    0.0,
    dx * camera.right[0],
    dx * camera.right[1],
    dx * camera.right[2],
    0.0,
    dy * camera.up[0],
    dy * camera.up[1],
    dy * camera.up[2],
    0.0,
  ]);

  device.queue.writeBuffer(objectBuffer, 0, scene.objectData, 0, scene.objectData.length);
  device.queue.writeBuffer(uniformBuffer, 0, camera.view);
  device.queue.writeBuffer(uniformBuffer, 64, camera.projection);
  device.queue.writeBuffer(cameraBuffer, 0, cameraData, 0, 12);

  const encoder = device.createCommandEncoder();
  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
      },
    ],
    depthStencilAttachment,
  });

  // --- Draw cubemap
  renderPass.setPipeline(cubemapPipeline);
  renderPass.setBindGroup(0, cubemapBindGroup);
  // renderPass.setBindGroup(1, fragmentBindGroup);
  renderPass.draw(6, 1, 0, 0);

  renderPass.setPipeline(standardPipeline);
  renderPass.setBindGroup(0, vertexBindGroup);

  let modelDrawn = 0;

  // --- Draw triangles
  renderPass.setVertexBuffer(0, triangle.bufferData);
  renderPass.setBindGroup(1, fragmentBindGroup);
  renderPass.draw(3, scene.triangleObjects.length, 0, modelDrawn);
  modelDrawn += scene.triangleObjects.length;

  // --- Draw floor
  renderPass.setVertexBuffer(0, quad.bufferData);
  renderPass.setBindGroup(1, fragmentBindGroup);
  renderPass.draw(6, scene.tileObjects.length, 0, modelDrawn);
  modelDrawn += scene.tileObjects.length;

  // --- Draw 3d model
  renderPass.setVertexBuffer(0, objmesh.bufferData);
  renderPass.setBindGroup(1, fragmentBindGroup);
  renderPass.draw(objmesh.vertexCount, 1, 0, modelDrawn);
  modelDrawn += 1;

  renderPass.end();
  device.queue.submit([encoder.finish()]);

  requestAnimationFrame(render);
}

render();
