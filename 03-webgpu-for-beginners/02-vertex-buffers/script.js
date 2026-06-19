import { initGPU, makeShaderModule } from "./library/helper/webgpu.js";
import { loadResources } from "./library/helper/utility.js";
import { Triangle } from "./Triangle.js";

const canvas = document.querySelector("canvas");
const { device, context } = await initGPU({ canvas });
const resources = await loadResources([
  {
    name: "shader",
    url: "./shader.wgsl",
    type: "text",
  },
]);
const shaderModule = makeShaderModule(device, resources.shader);

// --- Set up triangle
const triangle = new Triangle(device);

// --- Set up bind groups and layouts
const bindGroupLayout = device.createBindGroupLayout({ entries: [] });
const bindGroup = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [],
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
