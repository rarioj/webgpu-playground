import { initGPU, makeShaderModule, makeImagesTexture, makeDepthStencilSettings } from "./library/helper/webgpu.js";
import { loadResources } from "./library/helper/utility.js";
import { resourceArray } from "./config.js";
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
const camera = new FirstPersonCamera(canvas);
camera.position = [-7, -0.5, 0.5];
const scene = new Scene();

// --- Set up triangle and quad material
const triangle = new BasicMesh(
  device,
  new Float32Array([
    //x, y, z, u, v
    // triangle 1, point 1
    0.0, 0.0, 0.5, 0.5, 0.0,
    // triangle 1, point 2
    0.0, -0.5, -0.5, 0.0, 1.0,
    // triangle 1, point 3
    0.0, 0.5, -0.5, 1.0, 1.0,
  ]),
);
const quad = new BasicMesh(
  device,
  new Float32Array([
    //x, y, z, u, v
    // triangle 1, point 1
    -0.5, -0.5, 0.0, 0.0, 0.0,
    // triangle 1, point 2
    0.5, -0.5, 0.0, 1.0, 0.0,
    // triangle 1, point 3
    0.5, 0.5, 0.0, 1.0, 1.0,
    // triangle 2, point 1
    0.5, 0.5, 0.0, 1.0, 1.0,
    // triangle 2, point 2
    -0.5, 0.5, 0.0, 0.0, 1.0,
    // triangle 2, point 3
    -0.5, -0.5, 0.0, 0.0, 0.0,
  ]),
);

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
  renderPass.draw(3, scene.triangleModels.length, 0, modelDrawn);
  modelDrawn += scene.triangleModels.length;

  // --- Draw floor
  renderPass.setVertexBuffer(0, quad.bufferData);
  renderPass.setBindGroup(1, fragmentBindGroup);
  renderPass.draw(6, scene.tileModels.length, 0, modelDrawn);
  modelDrawn += scene.tileModels.length;

  renderPass.end();
  device.queue.submit([encoder.finish()]);

  requestAnimationFrame(render);
}

render();
