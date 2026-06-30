import { initGPU, makeShaderModule, makeImagesTexture } from "./library/helper/webgpu.js";
import { loadResources } from "./library/helper/utility.js";
import { FirstPersonCamera } from "./library/component/FirstPersonCamera.js";
import { Scene } from "./Scene.js";
import { BasicMesh } from "./library/component/BasicMesh.js";

const canvas = document.querySelector("canvas");
const { device, context } = await initGPU({ canvas });
const resources = await loadResources([
  {
    name: "shader",
    url: "./shader.wgsl",
    type: "text",
  },
  {
    name: "image",
    url: `./assets/images/15-512.webp`,
    type: "blob",
  },
]);
const shaderModule = makeShaderModule(device, resources.shader);
const { texture: imageTexture, view: imageView, sampler: imageSampler } = await makeImagesTexture(context, [resources.image]);

// --- Set up camera and scene
const camera = new FirstPersonCamera(canvas);
camera.position = [-2, 0, 0.5];
const scene = new Scene();

// --- Set up triangle material
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

// --- Set up uniform buffer
const uniformBuffer = device.createBuffer({
  size: 64 * 3, // 4x4 matrix * 3 types (projection, view, model)
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

// --- Set up bind groups and layouts
const bindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: {},
    },
    {
      binding: 1,
      visibility: GPUShaderStage.FRAGMENT,
      texture: {},
    },
    {
      binding: 2,
      visibility: GPUShaderStage.FRAGMENT,
      sampler: {},
    },
  ],
});
const bindGroup = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [
    {
      binding: 0,
      resource: {
        buffer: uniformBuffer,
      },
    },
    {
      binding: 1,
      resource: imageView,
    },
    {
      binding: 2,
      resource: imageSampler,
    },
  ],
});

// --- Set up pipelines and layouts
const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
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
});

function render() {
  scene.update();
  camera.update();

  scene.models.forEach((model) => {
    device.queue.writeBuffer(uniformBuffer, 0, model.matrix);
  });
  device.queue.writeBuffer(uniformBuffer, 64, camera.view);
  device.queue.writeBuffer(uniformBuffer, 128, camera.projection);

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
  });
  renderPass.setPipeline(pipeline);
  renderPass.setVertexBuffer(0, triangle.bufferData);
  renderPass.setBindGroup(0, bindGroup);
  renderPass.draw(3, 1, 0, 0);
  renderPass.end();

  device.queue.submit([encoder.finish()]);

  requestAnimationFrame(render);
}

render();
