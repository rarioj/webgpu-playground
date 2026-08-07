import { WebGPU } from "../../src/system/WebGPU.js";
import { createCanvasElement, createDebugElement } from "../../src/utilities/elements.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";
import { BoundingVolumeHierarchy } from "../../src/modules/BoundingVolumeHierarchy.js";
import { getRandom } from "../../src/utilities/maths.js";
import { getSphereCorners, getTriangleVertices } from "../../src/utilities/matrices.js";
import { config } from "./config.js";

const NUM_OBJECTS = Math.floor(parseInt(getQueryValue("objects", 512)));
const NUM_BUBBLES = Math.floor(NUM_OBJECTS / 2);
const NUM_TRIANGLES = NUM_OBJECTS - NUM_BUBBLES;
const MAX_BOUNCES = 4;

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
const debugBubbleCount = createDebugElement({ label: "🫧" }).content;
debugBubbleCount.innerText = `${NUM_BUBBLES} bubbles`;
const debugTriangleCount = createDebugElement({ label: "🔺" }).content;
debugTriangleCount.innerText = `${NUM_TRIANGLES} triangles`;

//// Assets

const assets = await loadAssets(config.resources, true);

const { textureView: screenView, sampler: screenSampler } = webgpu
  .setupTextureView(context)
  .setTextureFormat("rgba8unorm")
  .setTextureUsage(GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING)
  .build();

const { textureView: cubemapView, sampler: cubemapSampler } = webgpu
  .setupTextureView(context)
  .setTextureUsage(GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING)
  .loadBitmaps(assets.skyImages)
  .build({ overrideTextureViewDescriptor: { dimension: "cube" } });

//// Buffers and scene

const { builder: parameterBufferBuilder, buffer: parameterBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(16))
  .build();

const camera = new CameraObject(context);
camera.position = parameterBufferBuilder.dataPointer(0, 3);
parameterBufferBuilder.data[3] = MAX_BOUNCES;
camera.forward = parameterBufferBuilder.dataPointer(4, 7);
parameterBufferBuilder.data[7] = NUM_BUBBLES;
camera.scaledRight = parameterBufferBuilder.dataPointer(8, 11);
camera.scaledUp = parameterBufferBuilder.dataPointer(12, 15);
camera.setPosition(-30, 0, 0);
camera.updateProjectionMatrix();

const fpc = new FirstPersonControl(camera, context.canvas, { debug: true, moveSpeed: 0.4, orientSpeed: 0.25, flipY: true });

const { builder: objectIndicesBufferBuilder, buffer: objectIndicesBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setData(new Uint32Array(NUM_OBJECTS))
  .build();

const bvh = new BoundingVolumeHierarchy();
bvh.indices = objectIndicesBufferBuilder.dataPointer();

const { builder: objectsBufferBuilder, buffer: objectsBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(16 * NUM_OBJECTS))
  .build();

for (let i = 0; i < NUM_BUBBLES; i++) {
  const center = [getRandom(-50.0, 100.0), getRandom(-50.0, 100.0), getRandom(-50.0, 100.0)];
  const color = [getRandom(0.75, 0.9), getRandom(0.75, 0.9), getRandom(0.75, 0.9)];
  const radius = getRandom(0.1, 2.9);
  const corners = getSphereCorners(center, radius);
  bvh.addNodeFromCorners(corners);
  objectsBufferBuilder.data[i * 16 + 0] = center[0];
  objectsBufferBuilder.data[i * 16 + 1] = center[1];
  objectsBufferBuilder.data[i * 16 + 2] = center[2];
  objectsBufferBuilder.data[i * 16 + 3] = 0; // 0 = sphere, 1 = triangle
  objectsBufferBuilder.data[i * 16 + 4] = color[0];
  objectsBufferBuilder.data[i * 16 + 5] = color[1];
  objectsBufferBuilder.data[i * 16 + 6] = color[2];
  objectsBufferBuilder.data[i * 16 + 7] = radius;
  // index 8 - 15 defaults to 0
}
for (let i = NUM_BUBBLES; i < NUM_OBJECTS; i++) {
  const center = [getRandom(-50.0, 100.0), getRandom(-50.0, 100.0), getRandom(-50.0, 100.0)];
  const color = [getRandom(0.75, 0.9), getRandom(0.75, 0.9), getRandom(0.75, 0.9)];
  const offsets = [
    [getRandom(-3, 6), getRandom(-3, 6), getRandom(-3, 6)],
    [getRandom(-3, 6), getRandom(-3, 6), getRandom(-3, 6)],
    [getRandom(-3, 6), getRandom(-3, 6), getRandom(-3, 6)],
  ];
  const vertices = getTriangleVertices(center, offsets);
  bvh.addNodeFromVertices(vertices);
  objectsBufferBuilder.data[i * 16 + 0] = vertices[0][0];
  objectsBufferBuilder.data[i * 16 + 1] = vertices[0][1];
  objectsBufferBuilder.data[i * 16 + 2] = vertices[0][2];
  objectsBufferBuilder.data[i * 16 + 3] = 1; // 0 = sphere, 1 = triangle
  objectsBufferBuilder.data[i * 16 + 4] = vertices[1][0];
  objectsBufferBuilder.data[i * 16 + 5] = vertices[1][1];
  objectsBufferBuilder.data[i * 16 + 6] = vertices[1][2];
  objectsBufferBuilder.data[i * 16 + 7] = 1; // 0 = sphere, 1 = triangle
  objectsBufferBuilder.data[i * 16 + 8] = vertices[2][0];
  objectsBufferBuilder.data[i * 16 + 9] = vertices[2][1];
  objectsBufferBuilder.data[i * 16 + 10] = vertices[2][2];
  objectsBufferBuilder.data[i * 16 + 11] = 1; // 0 = sphere, 1 = triangle
  objectsBufferBuilder.data[i * 16 + 12] = color[0];
  objectsBufferBuilder.data[i * 16 + 13] = color[1];
  objectsBufferBuilder.data[i * 16 + 14] = color[2];
  objectsBufferBuilder.data[i * 16 + 15] = 1; // 0 = sphere, 1 = triangle
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
objectIndicesBufferBuilder.writeDataToBuffer();
objectsBufferBuilder.writeDataToBuffer();
nodeBufferBuilder.writeDataToBuffer();

//// Bind groups

const { bindGroup: screenBindGroup, bindGroupLayout: screenBindGroupLayout } = webgpu
  .setupBindGroup("Screen fragment")
  .addTexture(screenView, GPUShaderStage.FRAGMENT)
  .addSampler(screenSampler, GPUShaderStage.FRAGMENT)
  .build();

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
  .addBuffer(objectsBuffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .addBuffer(nodeBuffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .addBuffer(objectIndicesBuffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .addTexture(cubemapView, GPUShaderStage.COMPUTE, {
    viewDimension: "cube",
  })
  .addSampler(cubemapSampler, GPUShaderStage.COMPUTE)
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
