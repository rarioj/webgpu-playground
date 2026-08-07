import { WebGPU } from "../src/system/WebGPU.js";
import { createCanvasElement, createDebugElement } from "../src/utilities/elements.js";
import { getQueryValue } from "../src/utilities/helpers.js";
import { loadAssets } from "../src/utilities/assets.js";

const GRID_SIZE = Math.floor(parseInt(getQueryValue("size", 64)));
const UPDATE_INTERVAL = 50;
const POPULATION = 0.15; // min: 0 - max: 1
const WORKGROUP_SIZE = 8;
const WORKGROUP_COUNT = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);

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

const debugGridSize = createDebugElement({ label: "𖣯" }).content;
debugGridSize.innerText = `${GRID_SIZE}x${GRID_SIZE}`;

//// Assets

const assets = await loadAssets(
  [
    {
      name: "render",
      url: `./${getQueryValue("page")}/shaders/render.wgsl`,
      type: "text",
    },
    {
      name: "simulation",
      url: `./${getQueryValue("page")}/shaders/simulation.wgsl`,
      type: "text",
    },
  ],
  true,
);

//// Buffers

const vertexArray = new Float32Array([
  //x1,   y1,  x2,   y2,  x3,  y3
  -0.8, -0.8, 0.8, -0.8, 0.8, 0.8,
  //x1,   y1,  x2,  y2,   x3,  y3
  -0.8, -0.8, 0.8, 0.8, -0.8, 0.8,
]);
const { buffer: vertexBuffer } = webgpu
  .setupBuffer("Vertex")
  .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
  .setData(vertexArray)
  .build();

const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
const { buffer: uniformBuffer } = webgpu
  .setupBuffer("Uniform")
  .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  .setData(uniformArray)
  .build();

const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
for (let i = 0; i < cellStateArray.length; i++) {
  cellStateArray[i] = Math.random() < POPULATION ? 1 : 0; // random initial cell state
}
const { buffer: stateACellsBuffer, vertexBufferLayout: stateCellsBufferLayout } = webgpu
  .setupBuffer("State A cells")
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setData(cellStateArray)
  .addVertexAttribute("float32x2")
  .build();

const { buffer: stateBCellsBuffer } = webgpu
  .setupBuffer("State B cells")
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setSize(cellStateArray.byteLength)
  .build();

//// Bind groups

const { bindGroup: bindGroupA, bindGroupLayout: bindGroupLayout } = webgpu
  .setupBindGroup("A -> B cells")
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE)
  .addBuffer(stateACellsBuffer, GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, { type: "read-only-storage" })
  .addBuffer(stateBCellsBuffer, GPUShaderStage.COMPUTE, { type: "storage" })
  .build();

const { bindGroup: bindGroupB } = webgpu
  .setupBindGroup("B -> A cells")
  .setLayout(bindGroupLayout)
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE)
  .addBuffer(stateBCellsBuffer, GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, { type: "read-only-storage" })
  .addBuffer(stateACellsBuffer, GPUShaderStage.COMPUTE, { type: "storage" })
  .build();

//// Pipelines

const { pipeline: renderPipeline, pipelineLayout: pipelineLayout } = await webgpu
  .setupPipeline("Render")
  .addBindGroupLayout(bindGroupLayout)
  .useShaderCode(assets.render.data)
  .setVertexShader({ buffers: [stateCellsBufferLayout] })
  .setFragmentShader({ targets: [{ format: context.getConfiguration().format }] })
  .buildAsync();

const { pipeline: simulationPipeline } = await webgpu
  .setupPipeline("Compute")
  .setLayout(pipelineLayout)
  .useShaderCode(assets.simulation.data, [[`2 /* WORKGROUP_SIZE */;`, `${WORKGROUP_SIZE};`]])
  .setComputeShader()
  .buildAsync();

//// Renderer

let step = 0;

/** @type {GPURenderPassDescriptor} */
const renderPassDescriptor = {
  colorAttachments: [
    {
      view: undefined,
      loadOp: "clear",
      storeOp: "store",
      clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
    },
  ],
};

function render() {
  renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

  const computeBindGroup = step % 2 === 0 ? bindGroupA : bindGroupB;
  const renderBindGroup = step % 2 === 0 ? bindGroupB : bindGroupA;

  /** @type {GPUCommandBuffer} */
  const commandBuffer = webgpu
    .setupEncoder("Game board")

    .beginComputePass()
    .setPipeline(simulationPipeline)
    .setBindGroup(0, computeBindGroup)
    .dispatchWorkgroups(WORKGROUP_COUNT, WORKGROUP_COUNT)
    .end()

    .beginRenderPass(renderPassDescriptor)
    .setPipeline(renderPipeline)
    .setBindGroup(0, renderBindGroup)
    .setVertexBuffer(0, vertexBuffer)
    .draw(vertexArray.length / 2, GRID_SIZE * GRID_SIZE)
    .end()

    .submitCommandBuffer();

  step++;
}

setInterval(render, UPDATE_INTERVAL);
