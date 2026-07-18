import { WebGPUCore } from "./src/webgpu/WebGPUCore.js";
import { createCanvas, addDebugElement } from "./src/helper/elements.js";
import { getQueryValue, loadAssets } from "./src/helper/utilities.js";
import { BaseCamera } from "./src/components/BaseCamera.js";
import { BaseScene } from "./src/components/BaseScene.js";
import { BaseObject3D } from "./src/components/BaseObject3D.js";
import { getRandom } from "./src/helper/maths.js";

const NUM_SPHERES = Math.floor(parseInt(getQueryValue("spheres", 512)));

//// Initialisation

const canvas = createCanvas({
  container: document.querySelector("article"),
  width: 800,
  height: 600,
  style: {
    outline: "1px solid black",
  },
});
const webgpu = new WebGPUCore(canvas);
const { context, format } = await webgpu.init({
  deviceDescriptor: {
    requiredFeatures: ["core-features-and-limits", "bgra8unorm-storage"],
  },
  canvasConfiguration: {
    format: "bgra8unorm",
  },
});

const debugPerformance = addDebugElement({ label: "⏱️" }).inner;
const debugFramePerSec = addDebugElement({ label: "🏃‍♂️" }).inner;
const debugSphereCount = addDebugElement({ label: "🏀" }).inner;
debugSphereCount.innerText = `${NUM_SPHERES} spheres`;

//// Scene

const camera = new BaseCamera();
camera.setPosition(-30, 0, 0);
camera.storage.main = [camera.position, 0, camera.forward, 0, camera.right, 0, camera.up, NUM_SPHERES];

const scene = new BaseScene();
for (let i = 0; i < NUM_SPHERES; i++) {
  const sphere = new BaseObject3D();
  sphere.position = [getRandom(-50.0, 100.0), getRandom(-50.0, 100.0), getRandom(-50.0, 100.0)];
  sphere.color = [getRandom(0.1, 0.9), getRandom(0.1, 0.9), getRandom(0.1, 0.9)];
  sphere.radius = getRandom(0.1, 2.9);
  sphere.storage.main = [sphere.position, 0, sphere.color, sphere.radius];
  scene.addObject(sphere, "spheres");
}

//// Assets

const assets = await loadAssets([
  {
    name: "shaderCode",
    url: "./shaders/shader.wgsl",
    type: "text",
  },
  {
    name: "raytracerCode",
    url: "./shaders/raytracer.wgsl",
    type: "text",
  },
]);

const {
  view: screenView,
  sampler: screenSampler,
  bindGroupBuilder: screenBindGroupBuilder,
} = await webgpu.createTextureViewSampler(null, {
  textureDescriptor: {
    format: "rgba8unorm",
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  },
  textureViewDescriptor: {
    format: "rgba8unorm",
  },
});

//// Buffers

const { buffer: parameterBuffer } = webgpu.setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 64).build();
const { buffer: spheresBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 32 * NUM_SPHERES).build();

//// Bind groups

const { bindGroup: screenBindGroup, bindGroupLayout: screenBindGroupLayout } = screenBindGroupBuilder.build();

const { bindGroup: raytracerBindGroup, bindGroupLayout: raytracerBindGroupLayout } = webgpu
  .setupBindGroup()
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

const { pipeline: screenPipeline } = webgpu
  .setupPipeline()
  .addBindGroupLayout(screenBindGroupLayout)
  .setShaderCode(assets.shaderCode)
  .setVertexShader("vertexMain")
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .build();

const { pipeline: raytracerPipeline } = webgpu
  .setupPipeline()
  .addBindGroupLayout(raytracerBindGroupLayout)
  .setShaderCode(assets.raytracerCode)
  .setComputeShader("computeMain")
  .build();

//// Renderer

let fpsStart = performance.now();
let fpsCount = 0;
let fpsCurrent = 0;

/**
 *
 */
function render() {
  scene.update();
  camera.update();

  const startTime = performance.now();

  /** @type {GPURenderPassDescriptor} */
  const renderPassDescriptor = {
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
      },
    ],
  };

  webgpu.queueWriteBuffer(parameterBuffer, 0, camera.getStorageFloat(), 0, 16);
  webgpu.queueWriteBuffer(spheresBuffer, 0, scene.getStorageFloat(), 0, 8 * NUM_SPHERES);

  webgpu
    .setupEncoder()

    // compute pass
    .beginComputePass()
    .setPipeline(raytracerPipeline)
    .setBindGroup(0, raytracerBindGroup)
    .dispatchWorkgroups(Math.ceil(canvas.width / 8), Math.ceil(canvas.height / 8), 1)
    .end()

    // render pass
    .beginRenderPass(renderPassDescriptor)
    .setPipeline(screenPipeline)
    .setBindGroup(0, screenBindGroup)
    .draw(6, 1, 0, 0)
    .end()

    .queueSubmit()
    .onSubmittedWorkDone()
    .then(() => {
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
