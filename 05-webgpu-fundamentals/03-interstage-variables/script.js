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
  const webgpu = await WebGPU.init();
  const context = webgpu.createCanvasContext(canvas);
  const format = context.getConfiguration().format;

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

  const color = getQueryValue("color", "gradient");
  const entryPoint = color === "checker" ? "fragmentChecker" : "fragmentGradient";

  //// Pipelines

  const { pipeline } = await webgpu
    .setupPipeline("Pre-baked triangle pipeline")
    .setLayout("auto")
    .useShaderCode(assets.shaderCode.data)
    .setVertexShader()
    .setFragmentShader({ entryPoint, targets: [{ format }] })
    .buildAsync();

  //// Renderer

  webgpu
    .setupEncoder()
    .beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    })
    .setPipeline(pipeline)
    .draw(3)
    .end()
    .submitCommandBuffer();
} catch (error) {
  createModalElement("🛑 Error", error, { container: document.querySelector("main") });
  console.error(error);
}
