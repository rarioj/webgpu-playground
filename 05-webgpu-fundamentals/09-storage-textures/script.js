import { WebGPU } from "../../src/system/WebGPU.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { createCanvasElement, createModalElement } from "../../src/utilities/elements.js";

try {
  //// Initialisation

  const { canvas } = createCanvasElement({
    container: document.querySelector("article"),
    width: 512,
    height: 512,
    style: {
      outline: "1px solid black",
    },
  });
  const webgpu = await WebGPU.init({ deviceDescriptor: { requiredFeatures: ["bgra8unorm-storage"] } });
  const context = webgpu.createCanvasContext(canvas, { usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING });
  const format = context.getConfiguration().format;

  //// Assets

  const assets = await loadAssets([
    {
      name: "shaderCode",
      url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
      type: "text",
    },
  ]);

  //// Buffer

  const timeBufferBuilder = webgpu
    .setupBuffer()
    .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
    .loadBufferData(new Float32Array(1))
    .build();

  //// Pipelines

  const { pipeline } = webgpu
    .setupPipeline()
    .setLayout("auto")
    .useShaderCode(assets.shaderCode.data, [["rgba8unorm", format]])
    .setComputeShader()
    .build();

  //// Renderer
  function render() {
    const texture = context.getCurrentTexture();
    const { bindGroup } = webgpu
      .setupBindGroup()
      .setLayout(pipeline.getBindGroupLayout(0))
      .addStorageTexture(texture, GPUShaderStage.COMPUTE, { format })
      .addBuffer(timeBufferBuilder.buffer, GPUShaderStage.COMPUTE, { type: "uniform" })
      .build();

    timeBufferBuilder.setData([performance.now()]);
    timeBufferBuilder.writeDataToBuffer();

    webgpu
      .setupEncoder()
      .beginComputePass()
      .setPipeline(pipeline)
      .setBindGroup(0, bindGroup)
      .dispatchWorkgroups(texture.width, texture.height)
      .end()
      .submitCommandBuffer();

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
} catch (error) {
  createModalElement("🚫 Error", error, { container: document.querySelector("main"), closeButton: false });
  console.error(error);
}
