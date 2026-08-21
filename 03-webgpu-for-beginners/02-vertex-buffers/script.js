import { WebGPU } from "../../src/system/WebGPU.js";
import { createCanvasElement } from "../../src/utilities/elements.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";

//// Initialisation

const { canvas } = createCanvasElement({
  container: document.querySelector("article"),
  width: 512,
  height: 512,
  style: {
    outline: "1px solid black",
  },
});
const webgpu = await WebGPU.init();
const context = webgpu.createCanvasContext(canvas);

//// Assets

const assets = await loadAssets(
  [
    {
      name: "shader",
      url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
      type: "text",
    },
  ],
  true,
);

//// Buffers

const { buffer, vertexBufferLayout } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
  .loadBufferData(
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
  .addVertexAttribute("float32x2") // x, y
  .addVertexAttribute("float32x3") // r, g, b
  .build();

//// Bind groups

const { bindGroup, bindGroupLayout } = webgpu.setupBindGroup().build();

//// Pipelines

const { pipeline } = await webgpu
  .setupPipeline()
  .addBindGroupLayout(bindGroupLayout)
  .useShaderCode(assets.shader.data)
  .setVertexShader({ buffers: [vertexBufferLayout] })
  .setFragmentShader({ targets: [{ format: context.getConfiguration().format }] })
  .setRenderPrimitive({ topology: "triangle-list" })
  .buildAsync();

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
  .submitCommandBuffer();
