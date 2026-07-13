import { WebGPUCore } from "./src/webgpu/WebGPUCore.js";
import { createCanvas } from "./src/helper/elements.js";
import { getQueryValue, loadAssets } from "./src/helper/utilities.js";
import { getRandom } from "./src/helper/maths.js";

const NUM_BALLS = Math.floor(parseInt(getQueryValue("balls", 100)));
const BUFFER_SIZE = NUM_BALLS * 6 * Float32Array.BYTES_PER_ELEMENT;
const MIN_RADIUS = Math.floor(parseInt(getQueryValue("min_radius", 2)));
const MAX_RADIUS = Math.floor(parseInt(getQueryValue("max_radius", 10)));

//// Initialisation

const canvas = createCanvas({
  container: document.querySelector("article"),
  width: Math.floor(parseInt(getQueryValue("width", 512))),
  height: Math.floor(parseInt(getQueryValue("height", 512))),
  style: {
    outline: "1px solid black",
  },
});
const webgpu = new WebGPUCore(); // no canvas, use 2d context
const { device } = await webgpu.init();
const context = canvas.getContext("2d");

//// Assets

const assets = await loadAssets([
  {
    name: "compute",
    url: "./shaders/compute.wgsl",
    type: "text",
  },
]);

//// Buffers

const { buffer: inputBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, BUFFER_SIZE)
  .setLabel("Input buffer")
  .build();
const { buffer: outputBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, BUFFER_SIZE)
  .setLabel("Output buffer")
  .build();
const { buffer: stagingBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST, BUFFER_SIZE)
  .setLabel("Staging buffer")
  .build();
const { buffer: sceneBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 2 * Float32Array.BYTES_PER_ELEMENT)
  .setLabel("Scene buffer")
  .build();

webgpu.queueWriteBuffer(sceneBuffer, 0, new Float32Array([canvas.width, canvas.height]));

let updatedBallStates = null;
let currentBallStates = new Float32Array(new ArrayBuffer(BUFFER_SIZE));
for (let i = 0; i < NUM_BALLS; i++) {
  currentBallStates[i * 6 + 0] = getRandom(MIN_RADIUS, MAX_RADIUS); // radius
  currentBallStates[i * 6 + 1] = 0; // padding
  currentBallStates[i * 6 + 2] = getRandom(0, canvas.width); // position.x
  currentBallStates[i * 6 + 3] = getRandom(0, canvas.height); // position.y
  currentBallStates[i * 6 + 4] = getRandom(-100, 100); // velocity.x
  currentBallStates[i * 6 + 5] = getRandom(-100, 100); // velocity.y
}

//// Bind groups

const { bindGroup, bindGroupLayout } = webgpu
  .setupBindGroup()
  .setLabel("Bind group", "Bind group layout")
  .addBuffer(inputBuffer, GPUShaderStage.COMPUTE, { type: "read-only-storage" })
  .addBuffer(outputBuffer, GPUShaderStage.COMPUTE, { type: "storage" })
  .addBuffer(sceneBuffer, GPUShaderStage.COMPUTE, { type: "read-only-storage" })
  .build();

//// Pipelines

const { pipeline } = webgpu
  .setupPipeline()
  .setLabel("Compute pipeline")
  .addBindGroupLayout(bindGroupLayout)
  .setShaderCode(assets.compute)
  .setComputeShader("main")
  .build();

//// Renderer

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

while (true) {
  performance.mark("webgpu start");

  webgpu.queueWriteBuffer(inputBuffer, 0, currentBallStates);

  const builder = webgpu
    .setupEncoder()
    .beginComputePass()
    .setPipeline(pipeline)
    .setBindGroup(0, bindGroup)
    .dispatchWorkgroups(Math.ceil(BUFFER_SIZE / 64))
    .end()
    .copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, BUFFER_SIZE)
    .queueSubmit();

  await stagingBuffer.mapAsync(GPUMapMode.READ, 0, BUFFER_SIZE);

  const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE).slice();
  updatedBallStates = new Float32Array(copyArrayBuffer);
  stagingBuffer.unmap();

  performance.mark("webgpu end");
  performance.measure("webgpu", "webgpu start", "webgpu end");

  updateCanvas(updatedBallStates);

  currentBallStates = updatedBallStates;
  await animateFrame();
}
