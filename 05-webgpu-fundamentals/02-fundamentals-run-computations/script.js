import { WebGPU } from "../../src/system/WebGPU.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { createModalElement } from "../../src/utilities/elements.js";
import { getRandom } from "../../src/utilities/maths.js";

const NUM_COUNT = 100;

try {
  //// Initialisation

  const webgpu = await WebGPU.init();

  //// Assets

  const assets = await loadAssets(
    [
      {
        name: "shaderCode",
        url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
        type: "text",
      },
    ],
    true,
  );

  //// Pipelines

  const { pipeline } = await webgpu
    .setupPipeline("Square compute pipeline")
    .setLayout("auto")
    .useShaderCode(assets.shaderCode.data)
    .setComputeShader()
    .buildAsync();

  const input = [];
  for (let i = 0; i < NUM_COUNT; i++) {
    input.push(getRandom(0, 10000, true));
  }
  const { buffer: inputBuffer } = webgpu
    .setupBuffer("Input numbers")
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST)
    .loadBufferData(new Float32Array(input))
    .build();

  const { buffer: resultBuffer } = webgpu
    .setupBuffer("Result numbers")
    .setUsage(GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST)
    .setSize(input.length * 4)
    .build();

  //// Bind groups

  const { bindGroup } = webgpu.setupBindGroup("Input buffer bind group").setLayout(pipeline.getBindGroupLayout(0)).addBuffer(inputBuffer).build();

  //// Renderer

  webgpu
    .setupEncoder()
    .beginComputePass()
    .setPipeline(pipeline)
    .setBindGroup(0, bindGroup)
    .dispatchWorkgroups(input.length)
    .end()
    .copyBufferToBuffer(inputBuffer, 0, resultBuffer, 0, resultBuffer.size)
    .submitCommandBuffer();

  await resultBuffer.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(resultBuffer.getMappedRange().slice());
  resultBuffer.unmap();

  let content = `<header><h3>Square ${NUM_COUNT} Numbers</h3></header>`;

  content += "<main><p>";
  for (let i = 0; i < input.length; i++) {
    content += `${input[i]}^2 = ${result[i]}<br />`;
  }
  content += "</p></main>";

  const article = document.querySelector("article");
  article.innerHTML = content;
} catch (error) {
  createModalElement("🛑 Error", error, { container: document.querySelector("main") });
  console.error(error);
}
