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

  //// Pipelines

  const { pipeline } = await webgpu
    .setupPipeline("Pipeline")
    .setLayout("auto")
    .useShaderCode(assets.shaderCode.data)
    .setVertexShader()
    .setFragmentShader({ targets: [{ format }] })
    .buildAsync();

  //// Buffers & bind groups

  const renderData = [];

  const { builder: colorOffsetBufferBuilder, buffer: colorOffsetBuffer } = webgpu
    .setupBuffer("Static storage for color and offset")
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .loadBufferData(new Float32Array((4 + 2 + 2) * OBJECT_COUNT)) // color: vec4<f32> + offset: vec2<f32> + 2 padding
    .build();

  const { builder: scaleBufferBuilder, buffer: scaleBuffer } = webgpu
    .setupBuffer("Changing storage for scale")
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .loadBufferData(new Float32Array(2 * OBJECT_COUNT)) // scale: vec2<f32>
    .build();

  const { vertices: vertexData } =
    shape === "ring"
      ? createCircleGeometry({ radius: 0.5, innerRadius: 0.25, in3d: false, useTexture: false, useNormal: false, indexed: false })
      : createTriangleGeometry({ in3d: false, useTexture: false, useNormal: false, indexed: false });
  const vertexCount = vertexData.length / 2; // only x, y (no z, no texture, no normal)
  const { builder: vertexBufferBuilder, buffer: vertexBuffer } = webgpu
    .setupBuffer("Vertex buffer")
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .loadBufferData(vertexData)
    .build();

  for (let i = 0; i < OBJECT_COUNT; i++) {
    colorOffsetBufferBuilder.data.set([Math.random(), Math.random(), Math.random(), 1], i * 8 + 0); // color
    colorOffsetBufferBuilder.data.set([getRandom(-1.0, 1.0), getRandom(-1.0, 1.0)], i * 8 + 4); // offset
    renderData.push(getRandom(0.2, 0.6));
  }
  colorOffsetBufferBuilder.writeDataToBuffer();

  const { bindGroup } = webgpu
    .setupBindGroup("Uniform")
    .setLayout(pipeline.getBindGroupLayout(0))
    .addBuffer(colorOffsetBuffer)
    .addBuffer(scaleBuffer)
    .addBuffer(vertexBuffer)
    .build();

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

    const encoderBuilder = webgpu.setupEncoder().beginRenderPass(renderPassDescriptor).setPipeline(pipeline);

    for (let i = 0; i < OBJECT_COUNT; i++) {
      scaleBufferBuilder.data.set([renderData[i] / aspect, renderData[i]], i * 2);
    }
    scaleBufferBuilder.writeDataToBuffer();

    encoderBuilder.setBindGroup(0, bindGroup).draw(vertexCount, OBJECT_COUNT).end().submitCommandBuffer();
  }

  render();
} catch (error) {
  createModalElement("🛑 Error", error, { container: document.querySelector("main") });
  console.error(error);
}
