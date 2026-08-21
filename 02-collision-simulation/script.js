import { WebGPU } from "../src/system/WebGPU.js";
import { createCanvasElement } from "../src/utilities/elements.js";
import { getQueryValue } from "../src/utilities/helpers.js";
import { loadAssets } from "../src/utilities/assets.js";
import { getRandom } from "../src/utilities/maths.js";

const NUM_BALLS = Math.floor(parseInt(getQueryValue("balls", 128)));
const BUFFER_SIZE = NUM_BALLS * 6 * Float32Array.BYTES_PER_ELEMENT;
const MIN_RADIUS = Math.floor(parseInt(getQueryValue("min_radius", 4)));
const MAX_RADIUS = Math.floor(parseInt(getQueryValue("max_radius", 8)));
const WIDTH = Math.floor(parseInt(getQueryValue("width", 512)));
const HEIGHT = Math.floor(parseInt(getQueryValue("height", 512)));

//// Initialisation

const { canvas } = createCanvasElement({
  container: document.querySelector("article"),
  width: WIDTH,
  height: HEIGHT,
  forceDPR: 1,
  style: {
    outline: "1px solid black",
  },
});
const webgpu = await WebGPU.init();
const context = canvas.getContext("2d");

//// Assets

const assets = await loadAssets(
  [
    {
      name: "compute",
      url: `./${getQueryValue("page")}/shaders/compute.wgsl`,
      type: "text",
    },
  ],
  true,
);

//// Buffers

const inputStates = new Float32Array(new ArrayBuffer(BUFFER_SIZE));
for (let i = 0; i < NUM_BALLS; i++) {
  inputStates[i * 6 + 0] = getRandom(MIN_RADIUS, MAX_RADIUS); // radius
  inputStates[i * 6 + 1] = 0; // padding
  inputStates[i * 6 + 2] = getRandom(0, canvas.width); // position.x
  inputStates[i * 6 + 3] = getRandom(0, canvas.height); // position.y
  inputStates[i * 6 + 4] = getRandom(-100, 100); // velocity.x
  inputStates[i * 6 + 5] = getRandom(-100, 100); // velocity.y
}
const { builder: inputBufferBuilder, buffer: inputBuffer } = webgpu
  .setupBuffer("Input buffer")
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .loadBufferData(inputStates)
  .build();

const { buffer: outputBuffer } = webgpu
  .setupBuffer("Output buffer")
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC)
  .setSize(BUFFER_SIZE)
  .build();

const { buffer: stagingBuffer } = webgpu
  .setupBuffer("Staging buffer")
  .setUsage(GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST)
  .setSize(BUFFER_SIZE)
  .build();

const { buffer: sceneBuffer } = webgpu
  .setupBuffer("Scene buffer")
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .loadBufferData(new Float32Array([canvas.width, canvas.height]))
  .build();

//// Bind groups

const { bindGroup, bindGroupLayout } = webgpu
  .setupBindGroup("Bind group")
  .addBuffer(inputBuffer, GPUShaderStage.COMPUTE, { type: "read-only-storage" })
  .addBuffer(outputBuffer, GPUShaderStage.COMPUTE, { type: "storage" })
  .addBuffer(sceneBuffer, GPUShaderStage.COMPUTE, { type: "read-only-storage" })
  .build();

//// Pipelines

const { pipeline } = await webgpu
  .setupPipeline("Compute pipeline")
  .addBindGroupLayout(bindGroupLayout)
  .useShaderCode(assets.compute.data)
  .setComputeShader({ entryPoint: "main" })
  .buildAsync();

//// Renderer

function animateFrame() {
  return new Promise((event) => requestAnimationFrame(event));
}

function updateCanvas(data) {
  context.save();
  context.scale(1, -1);
  context.translate(0, -canvas.height);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffcccc";
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
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
  const builder = webgpu
    .setupEncoder()

    .beginComputePass()
    .setPipeline(pipeline)
    .setBindGroup(0, bindGroup)
    .dispatchWorkgroups(Math.ceil(BUFFER_SIZE / 64))
    .end()

    .copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, BUFFER_SIZE)
    .submitCommandBuffer();

  await stagingBuffer.mapAsync(GPUMapMode.READ, 0, BUFFER_SIZE);
  const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE).slice();
  const updatedStates = new Float32Array(copyArrayBuffer);
  stagingBuffer.unmap();

  updateCanvas(updatedStates);

  inputBufferBuilder.loadBufferData(updatedStates).writeDataToBuffer();
  await animateFrame();
}
