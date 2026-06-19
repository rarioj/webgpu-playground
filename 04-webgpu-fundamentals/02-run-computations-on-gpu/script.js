import { initGPU, makeShaderModule } from "./library/helper/webgpu.js";
import { loadResources } from "./library/helper/utility.js";

const { device } = await initGPU();
const resources = await loadResources([
  {
    name: "shader",
    url: "./shader.wgsl",
    type: "text",
  },
]);
const shaderModule = makeShaderModule(device, resources.shader);

// --- Set up compute pipeline
const computePipeline = device.createComputePipeline({
  label: "Doubling compute pipeline",
  layout: "auto",
  compute: {
    module: shaderModule,
    entryPoint: "computeMain",
  },
});

const inputData = new Float32Array([5, 55, 555]);
const inputBuffer = device.createBuffer({
  label: "Input buffer",
  size: inputData.byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(inputBuffer, 0, inputData);

const outputBuffer = device.createBuffer({
  label: "Output buffer",
  size: inputData.byteLength,
  usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
});

const bindGroup = device.createBindGroup({
  label: "Bind group for input buffer",
  layout: computePipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0,
      resource: inputBuffer,
    },
  ],
});

const encoder = device.createCommandEncoder({
  label: "Command encoder",
});

const computePass = encoder.beginComputePass({
  label: "Doubling compute pass",
});
computePass.setPipeline(computePipeline);
computePass.setBindGroup(0, bindGroup);
computePass.dispatchWorkgroups(inputData.length);
computePass.end();

encoder.copyBufferToBuffer(inputBuffer, 0, outputBuffer, 0, outputBuffer.size);

device.queue.submit([encoder.finish()]);

await outputBuffer.mapAsync(GPUMapMode.READ);
const outputData = new Float32Array(outputBuffer.getMappedRange());

document.getElementById("inputData").innerHTML = JSON.stringify(inputData);
document.getElementById("outputData").innerHTML = JSON.stringify(outputData);

outputBuffer.unmap();
