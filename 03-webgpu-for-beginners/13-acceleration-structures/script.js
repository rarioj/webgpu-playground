import { WebGPU } from "../../src/system/WebGPU.js";
import { createCanvasElement, createDebugElement } from "../../src/utilities/elements.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";
import { BoundingVolumeHierarchy } from "../../src/modules/BoundingVolumeHierarchy.js";
import { getRandom } from "../../src/utilities/maths.js";
import { getSphereCorners } from "../../src/utilities/matrices.js";

const NUM_SPHERES = Math.floor(parseInt(getQueryValue("spheres", 512)));

//// Initialisation

const { canvas } = createCanvasElement({
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

//// Buffers and scene

const { builder: parameterBufferBuilder, buffer: parameterBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(16))
  .build();

const camera = new CameraObject(context);
camera.position = parameterBufferBuilder.dataPointer(0, 3);
camera.forward = parameterBufferBuilder.dataPointer(4, 7);
camera.scaledRight = parameterBufferBuilder.dataPointer(8, 11);
camera.scaledUp = parameterBufferBuilder.dataPointer(12, 15);
parameterBufferBuilder.data[15] = NUM_SPHERES;
camera.setPosition(-30, 0, 0);
camera.updateProjectionMatrix();

const fpc = new FirstPersonControl(camera, context.canvas, { debug: true, moveSpeed: 0.4, orientSpeed: 0.25, flipY: true });

const { builder: sphereIndicesBufferBuilder, buffer: sphereIndicesBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setData(new Uint32Array(NUM_SPHERES))
  .build();

const bvh = new BoundingVolumeHierarchy();
bvh.indices = sphereIndicesBufferBuilder.dataPointer();

const { builder: spheresBufferBuilder, buffer: spheresBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(8 * NUM_SPHERES))
  .build();

for (let i = 0; i < NUM_SPHERES; i++) {
  const center = [getRandom(-50.0, 100.0), getRandom(-50.0, 100.0), getRandom(-50.0, 100.0)];
  const color = [getRandom(0.1, 0.9), getRandom(0.1, 0.9), getRandom(0.1, 0.9)];
  const radius = getRandom(0.1, 2.9);
  const corners = getSphereCorners(center, radius);
  bvh.addNodeFromCorners(corners);
  spheresBufferBuilder.data[i * 8 + 0] = center[0];
  spheresBufferBuilder.data[i * 8 + 1] = center[1];
  spheresBufferBuilder.data[i * 8 + 2] = center[2];
  spheresBufferBuilder.data[i * 8 + 3] = 0;
  spheresBufferBuilder.data[i * 8 + 4] = color[0];
  spheresBufferBuilder.data[i * 8 + 5] = color[1];
  spheresBufferBuilder.data[i * 8 + 6] = color[2];
  spheresBufferBuilder.data[i * 8 + 7] = radius;
}
bvh.build();

const { builder: nodeBufferBuilder, buffer: nodeBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(8 * bvh.assigned))
  .build();
for (let i = 0; i < bvh.assigned; i++) {
  nodeBufferBuilder.data.set(bvh.outputNodes[i].data, i * 8);
}

camera.addUpdateCallback(() => {
  camera.updateOrthonormalVectors();
  camera.updateViewMatrix();
  camera.move();
  parameterBufferBuilder.writeDataToBuffer();
});
sphereIndicesBufferBuilder.writeDataToBuffer();
spheresBufferBuilder.writeDataToBuffer();
nodeBufferBuilder.writeDataToBuffer();

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
  .addBuffer(nodeBuffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .addBuffer(sphereIndicesBuffer, GPUShaderStage.COMPUTE, {
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

  camera.update();

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
