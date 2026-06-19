import { initGPU, makeShaderModule, makeImagesTexture } from "./library/helper/webgpu.js";
import { loadResources, getRandomBetween } from "./library/helper/utility.js";
import { Triangle } from "./Triangle.js";
import { mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

const canvas = document.querySelector("canvas");
const { device, context } = await initGPU({ canvas });
const resources = await loadResources([
  {
    name: "shader",
    url: "./shader.wgsl",
    type: "text",
  },
  {
    name: "image1",
    url: `https://picsum.photos/seed/${getRandomBetween(1, 100)}/256/256`,
    type: "blob",
  },
]);
const shaderModule = makeShaderModule(device, resources.shader);
const { texture: imageTexture, view: imageView, sampler: imageSampler } = await makeImagesTexture(context, [resources.image1]);

// --- Set up triangle
const triangle = new Triangle(device);

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

let step = 0.0;

function render() {
  step += 0.01;

  if (step > 2.0 * Math.PI) {
    step -= 2.0 * Math.PI;
  }
  const projection = mat4.perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 10);
  const view = mat4.lookAt([-2, 0, 2], [0, 0, 0], [0, 0, 1]);
  const model = mat4.rotationZ(step);

  device.queue.writeBuffer(uniformBuffer, 0, model);
  device.queue.writeBuffer(uniformBuffer, 64, view);
  device.queue.writeBuffer(uniformBuffer, 128, projection);

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
