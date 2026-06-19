import { initGPU, makeShaderModule } from "./library/helper/webgpu.js";
import { loadResources } from "./library/helper/utility.js";

const GRID_SIZE = 64;
const UPDATE_INTERVAL = 100;
const POPULATION = 0.2; // min: 0 - max: 1
const WORKGROUP_SIZE = 8;
const WORKGROUP_COUNT = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);

const canvas = document.querySelector("canvas");
const { device, context } = await initGPU({ canvas });
const resources = await loadResources([
  {
    name: "render",
    url: "./render.wgsl",
    type: "text",
  },
  {
    name: "simulation",
    url: "./simulation.wgsl",
    type: "text",
  },
]);
const renderModule = makeShaderModule(device, resources.render);
const simulationModule = makeShaderModule(device, resources.simulation, {
  replacements: [[`2 /* WORKGROUP_SIZE */;`, `${WORKGROUP_SIZE};`]],
});

// --- Cell vertex buffer
const vertexArray = new Float32Array([
  //x1,   y1,  x2,   y2,  x3,  y3, - triangle 1
  -0.8, -0.8, 0.8, -0.8, 0.8, 0.8,
  //x1,   y1,  x2,   y2,  x3,  y3, - triangle 2
  -0.8, -0.8, 0.8, 0.8, -0.8, 0.8,
]);
const vertexBuffer = device.createBuffer({
  label: "Cell vertex buffer",
  size: vertexArray.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, vertexArray);

// --- Grid uniform buffer
const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
const uniformBuffer = device.createBuffer({
  label: "Grid uniform buffer",
  size: uniformArray.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

// --- Cell state buffer
const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
const cellStateBuffers = [
  device.createBuffer({
    label: "Cell state buffer A",
    size: cellStateArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  }),
  device.createBuffer({
    label: "Cell state buffer B",
    size: cellStateArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  }),
];
for (let i = 0; i < cellStateArray.length; i++) {
  cellStateArray[i] = Math.random() < POPULATION ? 1 : 0; // random initial cell state
}
device.queue.writeBuffer(cellStateBuffers[0], 0, cellStateArray);

// --- Layout for bind group and pipeline
const bindGroupLayout = device.createBindGroupLayout({
  label: "Cell bind group layout",
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
      buffer: {},
    },
    {
      binding: 1,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
      buffer: { type: "read-only-storage" },
    },
    {
      binding: 2,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "storage" },
    },
  ],
});
const pipelineLayout = device.createPipelineLayout({
  label: "Cell pipeline layout",
  bindGroupLayouts: [bindGroupLayout],
});

// --- Render pipeline
const renderPipeline = device.createRenderPipeline({
  label: "Render pipeline",
  layout: pipelineLayout,
  vertex: {
    module: renderModule,
    entryPoint: "vertexMain",
    buffers: [
      {
        arrayStride: 8,
        attributes: [
          {
            format: "float32x2",
            offset: 0,
            shaderLocation: 0,
          },
        ],
      },
    ],
  },
  fragment: {
    module: renderModule,
    entryPoint: "fragmentMain",
    targets: [{ format: context.getConfiguration().format }],
  },
});

// --- Simulation pipeline
const simulationPipeline = device.createComputePipeline({
  label: "Simulation pipeline",
  layout: pipelineLayout,
  compute: {
    module: simulationModule,
    entryPoint: "computeMain",
  },
});

// --- Final bind groups
const bindGroups = [
  device.createBindGroup({
    label: "Cell renderer bind group A",
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: cellStateBuffers[0],
        },
      },
      {
        binding: 2,
        resource: {
          buffer: cellStateBuffers[1],
        },
      },
    ],
  }),
  device.createBindGroup({
    label: "Cell renderer bind group B",
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: cellStateBuffers[1],
        },
      },
      {
        binding: 2,
        resource: {
          buffer: cellStateBuffers[0],
        },
      },
    ],
  }),
];

let step = 0;

function nextFrame() {
  const encoder = device.createCommandEncoder();

  const computePass = encoder.beginComputePass();
  computePass.setPipeline(simulationPipeline);
  computePass.setBindGroup(0, bindGroups[step % 2]);
  computePass.dispatchWorkgroups(WORKGROUP_COUNT, WORKGROUP_COUNT);
  computePass.end();

  step++;

  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
      },
    ],
  });
  renderPass.setPipeline(renderPipeline);
  renderPass.setBindGroup(0, bindGroups[step % 2]);
  renderPass.setVertexBuffer(0, vertexBuffer);
  renderPass.draw(vertexArray.length / 2, GRID_SIZE * GRID_SIZE);
  renderPass.end();

  device.queue.submit([encoder.finish()]);
}

setInterval(nextFrame, UPDATE_INTERVAL);
