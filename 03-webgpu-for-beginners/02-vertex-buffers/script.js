import { WebGPUCore } from "./src/webgpu/WebGPUCore.js";
import { createCanvas } from "./src/helper/elements.js";
import { loadAssets } from "./src/helper/utilities.js";

//// Initialisation

const canvas = createCanvas({
  container: document.querySelector("article"),
  width: 512,
  height: 512,
  style: {
    outline: "1px solid black",
  },
});
const webgpu = new WebGPUCore(canvas);
const { context, format } = await webgpu.init();

//// Assets

const assets = await loadAssets([
  {
    name: "shader",
    url: "./shaders/shader.wgsl",
    type: "text",
  },
]);

//// Buffers

const { buffer, bufferLayout } = webgpu
  .setupBuffer(
    GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    new Float32Array([
      //x, y, r, g, b
      // top corner (red)
      0.0, 0.5, 1.0, 0.0, 0.0,
      // bottom left corner (green)
      -0.5, -0.5, 0.0, 1.0, 0.0,
      // bottom right corner (blue)
      0.5, -0.5, 0.0, 0.0, 1.0,
    ]),
  )
  .addVertexAttribute(2) // x, y
  .addVertexAttribute(3) // r, g, b
  .build();

//// Bind groups

const { bindGroup, bindGroupLayout } = webgpu.setupBindGroup().build();

//// Pipelines

const { pipeline } = webgpu
  .setupPipeline()
  .addBindGroupLayout(bindGroupLayout)
  .setShaderCode(assets.shader)
  .setVertexShader("vertexMain", { buffers: [bufferLayout] })
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .build();

//// Renderer

/** @type {GPURenderPassDescriptor} */
const renderPassDescriptor = {
  colorAttachments: [
    {
      view: context.getCurrentTexture().createView(),
      loadOp: "clear",
      storeOp: "store",
      clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
    },
  ],
};

webgpu
  .setupEncoder()
  .beginRenderPass(renderPassDescriptor)
  .setPipeline(pipeline)
  .setVertexBuffer(0, buffer)
  .setBindGroup(0, bindGroup)
  .draw(3, 1)
  .end()
  .queueSubmit();
