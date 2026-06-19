import { getQueryValue, loadResources, getRandomBetween } from "./library/helper/utility.js";
import { initGPU, makeShaderModule } from "./library/helper/webgpu.js";

const NUM_BALLS = Math.floor(parseInt(getQueryValue("balls", 100)));
const BUFFER_SIZE = NUM_BALLS * 6 * Float32Array.BYTES_PER_ELEMENT;
const MIN_RADIUS = Math.floor(parseInt(getQueryValue("min_radius", 2)));
const MAX_RADIUS = Math.floor(parseInt(getQueryValue("max_radius", 10)));

const { device } = await initGPU();
const resources = await loadResources([
  {
    name: "compute",
    url: "./compute.wgsl",
    type: "text",
  },
]);
const computeModule = makeShaderModule(device, resources.compute);

const canvas = document.querySelector("canvas");
canvas.width = Math.floor(parseInt(getQueryValue("width", 512)));
canvas.height = Math.floor(parseInt(getQueryValue("height", 512)));
const context = canvas.getContext("2d");

const inputBuffer = device.createBuffer({
  size: BUFFER_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
const outputBuffer = device.createBuffer({
  size: BUFFER_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
});
const stagingBuffer = device.createBuffer({
  size: BUFFER_SIZE,
  usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
});
const sceneBuffer = device.createBuffer({
  size: 2 * Float32Array.BYTES_PER_ELEMENT,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(sceneBuffer, 0, new Float32Array([canvas.width, canvas.height]));

const bindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "read-only-storage" },
    },
    {
      binding: 1,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "storage" },
    },
    {
      binding: 2,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "read-only-storage" },
    },
  ],
});

const bindGroup = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [
    {
      binding: 0,
      resource: {
        buffer: inputBuffer,
      },
    },
    {
      binding: 1,
      resource: {
        buffer: outputBuffer,
      },
    },
    {
      binding: 2,
      resource: {
        buffer: sceneBuffer,
      },
    },
  ],
});

const computePipeline = device.createComputePipeline({
  layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
  compute: {
    module: computeModule,
    entryPoint: "main",
  },
});

function animateFrame() {
  return new Promise((event) => requestAnimationFrame(event));
}

function updateCanvas(data) {
  context.save();
  context.scale(1, -1);
  context.translate(0, -canvas.height);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "red";

  for (let j = 0; j < data.length; j += 6) {
    const radius = data[j + 0];
    const posX = data[j + 2];
    const posY = data[j + 3];
    const velX = data[j + 4];
    const velY = data[j + 5];
    let heading = Math.atan(velY / (velX === 0 ? Number.EPSILON : velX));
    if (velX < 0) {
      heading += Math.PI;
    }
    const newPosX = posX + Math.cos(heading) * Math.sqrt(2) * radius;
    const newPosY = posY + Math.sin(heading) * Math.sqrt(2) * radius;

    context.beginPath();
    context.arc(posX, posY, radius, 0, 2 * Math.PI, true);
    context.moveTo(newPosX, newPosY);
    context.arc(posX, posY, radius, heading - Math.PI / 4, heading + Math.PI / 4, true);
    context.lineTo(newPosX, newPosY);
    context.closePath();
    context.fill();
  }

  context.restore();
}

let inputBalls = new Float32Array(new ArrayBuffer(BUFFER_SIZE));
for (let i = 0; i < NUM_BALLS; i++) {
  inputBalls[i * 6 + 0] = getRandomBetween(MIN_RADIUS, MAX_RADIUS); // radius
  inputBalls[i * 6 + 1] = 0; // padding?
  inputBalls[i * 6 + 2] = getRandomBetween(0, canvas.width); // position.x
  inputBalls[i * 6 + 3] = getRandomBetween(0, canvas.height); // position.y
  inputBalls[i * 6 + 4] = getRandomBetween(-100, 100); // velocity.x
  inputBalls[i * 6 + 5] = getRandomBetween(-100, 100); // velocity.y
}
let newInputBalls = null;

while (true) {
  performance.mark("webgpu start");
  device.queue.writeBuffer(inputBuffer, 0, inputBalls);

  const encoder = device.createCommandEncoder();
  const computePass = encoder.beginComputePass();
  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, bindGroup);
  computePass.dispatchWorkgroups(Math.ceil(BUFFER_SIZE / 64));
  computePass.end();
  encoder.copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, BUFFER_SIZE);
  device.queue.submit([encoder.finish()]);

  await stagingBuffer.mapAsync(GPUMapMode.READ, 0, BUFFER_SIZE);

  const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE).slice();
  newInputBalls = new Float32Array(copyArrayBuffer);
  stagingBuffer.unmap();
  performance.mark("webgpu end");
  performance.measure("webgpu", "webgpu start", "webgpu end");

  updateCanvas(newInputBalls);
  inputBalls = newInputBalls;
  await animateFrame();
}
