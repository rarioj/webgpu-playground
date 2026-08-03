import { WebGPU } from "../../src/system/WebGPU.js";
import { createCanvasElement, createDebugElement } from "../../src/utilities/elements.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { getRandom } from "../../src/utilities/maths.js";

const NUM_SPHERES = Math.floor(parseInt(getQueryValue("spheres", 512)));

//// Initialisation

const canvas = createCanvasElement({
  container: document.querySelector("article"),
  width: 800,
  height: 600,
  style: {
    outline: "1px solid black",
  },
});
const webgpu = await WebGPU.init({ deviceDescriptor: { requiredFeatures: ["core-features-and-limits", "bgra8unorm-storage"] } });
const context = webgpu.createCanvasContext(canvas, { format: "bgra8unorm" });

const debugPerformance = createDebugElement({ label: "⏱️" }).content;
const debugFramePerSec = createDebugElement({ label: "🏃‍♂️" }).content;
const debugSphereCount = createDebugElement({ label: "🏀" }).content;
debugSphereCount.innerText = `${NUM_SPHERES} spheres`;

//// Assets

const assets = await loadAssets(
  [
    {
      name: "shaderCode",
      url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
      type: "text",
    },
    {
      name: "raytracerCode",
      url: `./${getQueryValue("page")}/shaders/raytracer.wgsl`,
      type: "text",
    },
  ],
  true,
);

const { textureView: screenView, sampler: screenSampler } = webgpu
  .setupTextureView(context)
  .setTextureFormat("rgba8unorm")
  .setTextureUsage(GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING)
  .build();

//// Buffers

const { builder: parameterBufferBuilder, buffer: parameterBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(16))
  .build();

const { builder: spheresBufferBuilder, buffer: spheresBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(8 * NUM_SPHERES))
  .build();

//// Scene

const camera = new CameraObject(context);
camera.position = parameterBufferBuilder.dataPointer(0, 3);
camera.forward = parameterBufferBuilder.dataPointer(4, 7);
camera.right = parameterBufferBuilder.dataPointer(8, 11);
camera.up = parameterBufferBuilder.dataPointer(12, 15);
parameterBufferBuilder.data[15] = NUM_SPHERES;
camera.setPosition(-30, 0, 0);
camera.updateOrthonormalVectors();
camera.updateViewMatrix();
camera.updateProjectionMatrix();

for (let i = 0; i < NUM_SPHERES; i++) {
  spheresBufferBuilder.data[i * 8 + 0] = getRandom(-50.0, 100.0);
  spheresBufferBuilder.data[i * 8 + 1] = getRandom(-50.0, 100.0);
  spheresBufferBuilder.data[i * 8 + 2] = getRandom(-50.0, 100.0);
  spheresBufferBuilder.data[i * 8 + 3] = 0;
  spheresBufferBuilder.data[i * 8 + 4] = getRandom(0.1, 0.9);
  spheresBufferBuilder.data[i * 8 + 5] = getRandom(0.1, 0.9);
  spheresBufferBuilder.data[i * 8 + 6] = getRandom(0.1, 0.9);
  spheresBufferBuilder.data[i * 8 + 7] = getRandom(0.1, 2.9);
}

parameterBufferBuilder.writeDataToBuffer();
spheresBufferBuilder.writeDataToBuffer();

//// Bind groups

const { bindGroup: screenBindGroup, bindGroupLayout: screenBindGroupLayout } = webgpu
  .setupBindGroup("Screen fragment")
  .addTexture(screenView, GPUShaderStage.FRAGMENT)
  .addSampler(screenSampler, GPUShaderStage.FRAGMENT)
  .build();

const { bindGroup: raytracerBindGroup, bindGroupLayout: raytracerBindGroupLayout } = webgpu
  .setupBindGroup("Ray tracing")
  .addStorageTexture(screenView, GPUShaderStage.COMPUTE, {
    access: "write-only",
    format: "rgba8unorm",
    viewDimension: "2d",
  })
  .addBuffer(parameterBuffer, GPUShaderStage.COMPUTE, {
    type: "uniform",
  })
  .addBuffer(spheresBuffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .build();

//// Pipelines

const { pipeline: screenPipeline } = await webgpu
  .setupPipeline()
  .addBindGroupLayout(screenBindGroupLayout)
  .useShaderCode(assets.shaderCode.data)
  .setVertexShader()
  .setFragmentShader({ targets: [{ format: context.getConfiguration().format }] })
  .setRenderPrimitive({ topology: "triangle-list" })
  .buildAsync();

const { pipeline: raytracerPipeline } = await webgpu
  .setupPipeline()
  .addBindGroupLayout(raytracerBindGroupLayout)
  .useShaderCode(assets.raytracerCode.data)
  .setComputeShader()
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

let fpsStart = performance.now();
let fpsCount = 0;
let fpsCurrent = 0;

/**
 *
 */
function render() {
  renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

  const startTime = performance.now();

  webgpu
    .setupEncoder()

    // compute pass
    .beginComputePass()
    .setPipeline(raytracerPipeline)
    .setBindGroup(0, raytracerBindGroup)
    .dispatchWorkgroups(Math.ceil(canvas.width / 16), Math.ceil(canvas.height / 16), 1)
    .end()

    // render pass
    .beginRenderPass(renderPassDescriptor)
    .setPipeline(screenPipeline)
    .setBindGroup(0, screenBindGroup)
    .draw(6, 1, 0, 0)
    .end()

    .submitCommandBuffer(() => {
      const endTime = performance.now();
      debugPerformance.innerText = `${(endTime - startTime).toFixed(1)} ms`;
    });

  fpsCount++;
  if (startTime - fpsStart >= 1000) {
    fpsCurrent = Math.round((fpsCount * 1000) / (startTime - fpsStart));
    fpsCount = 0;
    fpsStart = startTime;
    debugFramePerSec.innerText = `${fpsCurrent} fps`;
  }

  requestAnimationFrame(render);
}

render();
