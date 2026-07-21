import { WebGPUCore } from "../src/webgpu/WebGPUCore.js";
import { createCanvas } from "../src/helper/elements.js";
import { getQueryValue, loadAssets } from "../src/helper/utilities.js";

const GRID_SIZE = Math.floor(parseInt(getQueryValue("size", 64)));
const UPDATE_INTERVAL = 100;
const POPULATION = 0.15; // min: 0 - max: 1
const WORKGROUP_SIZE = 8;
const WORKGROUP_COUNT = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);

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
    name: "render",
    url: `./${getQueryValue("page")}/shaders/render.wgsl`,
    type: "text",
  },
  {
    name: "simulation",
    url: `./${getQueryValue("page")}/shaders/simulation.wgsl`,
    type: "text",
  },
]);

//// Buffers

const vertexArray = new Float32Array([
  //x1,   y1,  x2,   y2,  x3,  y3
  -0.8, -0.8, 0.8, -0.8, 0.8, 0.8,
  //x1,   y1,  x2,  y2,   x3,  y3
  -0.8, -0.8, 0.8, 0.8, -0.8, 0.8,
]);
const { buffer: vertexBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, vertexArray.byteLength)
  .setLabel("Vertex buffer")
  .build();

const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
const { buffer: uniformBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, uniformArray.byteLength)
  .setLabel("Uniform buffer")
  .build();

const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
for (let i = 0; i < cellStateArray.length; i++) {
  cellStateArray[i] = Math.random() < POPULATION ? 1 : 0; // random initial cell state
}
const { buffer: cellStateBufferA, bufferLayout: cellStateBufferLayout } = webgpu
  .setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, cellStateArray.byteLength)
  .setLabel("Cell state A buffer")
  .addVertexAttribute(2)
  .build();
const { buffer: cellStateBufferB } = webgpu
  .setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, cellStateArray.byteLength)
  .setLabel("Cell state B buffer")
  .build();

webgpu.queueWriteBuffer(vertexBuffer, 0, vertexArray);
webgpu.queueWriteBuffer(uniformBuffer, 0, uniformArray);
webgpu.queueWriteBuffer(cellStateBufferA, 0, cellStateArray);

//// Bind groups

const { bindGroup: bindGroupA, bindGroupLayout: bindGroupLayout } = webgpu
  .setupBindGroup()
  .setLabel("Bind group A - B", "Bind group layout")
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE)
  .addBuffer(cellStateBufferA, GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, { type: "read-only-storage" })
  .addBuffer(cellStateBufferB, GPUShaderStage.COMPUTE, { type: "storage" })
  .build();

const { bindGroup: bindGroupB } = webgpu
  .setupBindGroup(bindGroupLayout)
  .setLabel("Bind group B - A")
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE)
  .addBuffer(cellStateBufferB, GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, { type: "read-only-storage" })
  .addBuffer(cellStateBufferA, GPUShaderStage.COMPUTE, { type: "storage" })
  .build();

//// Pipelines

const { pipeline: renderPipeline, pipelineLayout: pipelineLayout } = webgpu
  .setupPipeline()
  .setLabel("Render pipeline", "Pipeline layout")
  .addBindGroupLayout(bindGroupLayout)
  .setShaderCode(assets.render)
  .setVertexShader("vertexMain", { buffers: [cellStateBufferLayout] })
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .build();

const { pipeline: simulationPipeline } = webgpu
  .setupPipeline(pipelineLayout)
  .setLabel("Compute pipeline")
  .setShaderCode(assets.simulation, { replacements: [[`2 /* WORKGROUP_SIZE */;`, `${WORKGROUP_SIZE};`]] })
  .setComputeShader("computeMain")
  .build();

//// Renderer

let step = 0;

function render() {
  const computeBindGroup = step % 2 === 0 ? bindGroupA : bindGroupB;
  const renderBindGroup = step % 2 === 0 ? bindGroupB : bindGroupA;

  /** @type {GPURenderPassDescriptor} */
  const renderPassDescriptor = {
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
      },
    ],
  };
  webgpu
    .setupEncoder()
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
    .queueSubmit();

  step++;
}

setInterval(render, UPDATE_INTERVAL);
