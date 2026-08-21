import { WebGPU } from "../../src/system/WebGPU.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { createCanvasElement, createModalElement } from "../../src/utilities/elements.js";
import { getRandom } from "../../src/utilities/maths.js";
import { createTriangleGeometry, createCircleGeometry } from "../../src/utilities/geometries.js";

const OBJECT_COUNT = 100;
const shape = getQueryValue("shape", "triangle");

try {
  //// Initialisation

  const { canvas } = createCanvasElement({
    container: document.querySelector("article"),
    width: 800,
    height: 600,
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

  //// Buffers

  const renderData = [];

  const { vertices: vertexData, indices: vertexIndex } =
    shape === "ring"
      ? createCircleGeometry({ radius: 0.5, innerRadius: 0.25, in3d: true, useTexture: false, useNormal: false, indexed: true })
      : createTriangleGeometry({ in3d: true, useTexture: false, useNormal: false, indexed: true });
  // A hack to replace coordinate [z] into normalized color [rgb] uint8 * 3
  for (let i = 0; i < vertexData.length / 3; i++) {
    vertexData[i * 3 + 2] = i % 2 ? 1.0 : 0.1;
  }
  const {
    builder: vertexBufferBuilder,
    buffer: vertexBuffer,
    arrayVertexBufferLayout,
  } = webgpu
    .setupBuffer("Vertex buffer")
    .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
    .loadBufferData(vertexData)
    .addVertexAttribute("float32x2") // x, y
    .addVertexAttribute("unorm8x4") // gradient_r, gradient_g, gradient_b
    .newVertexBufferLayoutGroup("instance")
    .addVertexAttribute("unorm8x4") // r, g, b, a
    .addVertexAttribute("float32x2") // offset_x, offset_y
    .newVertexBufferLayoutGroup("instance")
    .addVertexAttribute("float32x2") // scale_x, scale_y
    .build();
  const { buffer: indexBuffer } = webgpu
    .setupBuffer("Vertex index")
    .setUsage(GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST)
    .loadBufferData(vertexIndex)
    .build();

  const { builder: colorOffsetBufferBuilder, buffer: colorOffsetBuffer } = webgpu
    .setupBuffer("Static storage for color and offset")
    .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
    .loadBufferData(new Float32Array((1 + 2) * OBJECT_COUNT)) // color: 1 + offset: 2
    .build();

  const { builder: scaleBufferBuilder, buffer: scaleBuffer } = webgpu
    .setupBuffer("Changing storage for scale")
    .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
    .loadBufferData(new Float32Array(2 * OBJECT_COUNT)) // scale: 2
    .build();

  for (let i = 0; i < OBJECT_COUNT; i++) {
    const red = Math.random() * 255;
    const green = Math.random() * 255;
    const blue = Math.random() * 255;
    const color = (red * 65536 + green * 256 + blue) / 16777215;
    colorOffsetBufferBuilder.data.set([color], i * 3 + 0); // color
    colorOffsetBufferBuilder.data.set([getRandom(-1.0, 1.0), getRandom(-1.0, 1.0)], i * 3 + 1); // offset
    renderData.push(getRandom(0.2, 0.6));
  }
  colorOffsetBufferBuilder.writeDataToBuffer();

  //// Pipelines

  const { pipeline } = await webgpu
    .setupPipeline("Pipeline")
    .setLayout("auto")
    .useShaderCode(assets.shaderCode.data)
    .setVertexShader({ buffers: arrayVertexBufferLayout })
    .setFragmentShader({ targets: [{ format }] })
    .buildAsync();

  //// Renderer

  /** @type {GPURenderPassDescriptor} */
  const renderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined,
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
      },
    ],
  };

  function render() {
    const aspect = canvas.width / canvas.height;
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    for (let i = 0; i < OBJECT_COUNT; i++) {
      scaleBufferBuilder.data.set([renderData[i] / aspect, renderData[i]], i * 2);
    }
    scaleBufferBuilder.writeDataToBuffer();

    webgpu
      .setupEncoder()
      .beginRenderPass(renderPassDescriptor)
      .setPipeline(pipeline)
      .setVertexBuffer(0, vertexBuffer)
      .setVertexBuffer(1, colorOffsetBuffer)
      .setVertexBuffer(2, scaleBuffer)
      .setIndexBuffer(indexBuffer, "uint32")
      .drawIndexed(vertexIndex.length, OBJECT_COUNT)
      .end()
      .submitCommandBuffer();
  }

  render();
} catch (error) {
  createModalElement("🛑 Error", error, { container: document.querySelector("main") });
  console.error(error);
}
