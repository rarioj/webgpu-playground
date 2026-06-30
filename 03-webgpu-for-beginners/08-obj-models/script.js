import { initGPU, makeShaderModule, makeImagesTexture, makeDepthStencilSettings } from "./library/helper/webgpu.js";
import { loadResources, parseObjCode } from "./library/helper/utility.js";
import { resourceArray, vertexMap } from "./config.js";
import { FirstPersonCamera } from "./library/component/FirstPersonCamera.js";
import { Scene } from "./Scene.js";
import { BasicMesh } from "./library/component/BasicMesh.js";

const canvas = document.querySelector("canvas");
const { device, context } = await initGPU({ canvas });
const resources = await loadResources(resourceArray);
const shaderModule = makeShaderModule(device, resources.shader);
const {
  texture: imageTexture,
  view: imageView,
  sampler: imageSampler,
  bindGroupLayout: fragmentBindGroupLayout,
  bindGroup: fragmentBindGroup,
} = await makeImagesTexture(context, resources.image, { createBindGroup: true });

// --- Set up camera and scene
const camera = new FirstPersonCamera(canvas, { far: 100 });
camera.position = [-7, -0.5, 0.5];
const scene = new Scene();

// --- Set up triangle, quad, and obj meshes
const triangle = new BasicMesh(device, vertexMap.triangle);
const quad = new BasicMesh(device, vertexMap.quad);
const objmesh = new BasicMesh(device, parseObjCode(resources.model));

// --- Set up uniform buffer
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

// --- Set up bind groups and layouts
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
const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [vertexBindGroupLayout, fragmentBindGroupLayout] });
const pipeline = device.createRenderPipeline({
  layout: pipelineLayout,
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

function render() {
  scene.update();
  camera.update();

  device.queue.writeBuffer(objectBuffer, 0, scene.objectData, 0, scene.objectData.length);
  device.queue.writeBuffer(uniformBuffer, 0, camera.view);
  device.queue.writeBuffer(uniformBuffer, 64, camera.projection);

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
  renderPass.setPipeline(pipeline);
  renderPass.setBindGroup(0, vertexBindGroup);

  let modelDrawn = 0;

  // --- Draw triangles
  renderPass.setVertexBuffer(0, triangle.bufferData);
  renderPass.setBindGroup(1, fragmentBindGroup);
  renderPass.draw(3, scene.triangles.length, 0, modelDrawn);
  modelDrawn += scene.triangles.length;

  // --- Draw floor
  renderPass.setVertexBuffer(0, quad.bufferData);
  renderPass.setBindGroup(1, fragmentBindGroup);
  renderPass.draw(6, scene.tiles.length, 0, modelDrawn);
  modelDrawn += scene.tiles.length;

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
