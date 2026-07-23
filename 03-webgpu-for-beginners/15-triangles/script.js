import { WebGPUCore } from "../../src/webgpu/WebGPUCore.js";
import { createCanvas, addDebugElement } from "../../src/helper/elements.js";
import { getQueryValue, loadAssets } from "../../src/helper/utilities.js";
import { config } from "./config.js";
import { FirstPersonCamera } from "../../src/components/FirstPersonCamera.js";
import { BoundingVolumeHierarchyStructure } from "../../src/components/BoundingVolumeHierarchyStructure.js";
import { SphericalNode } from "../../src/components/SphericalNode.js";
import { TriangularNode } from "../../src/components/TriangularNode.js";
import { getRandom } from "../../src/helper/maths.js";

const NUM_OBJECTS = Math.floor(parseInt(getQueryValue("objects", 512)));
const NUM_BUBBLES = Math.floor(NUM_OBJECTS / 2);
const NUM_TRIANGLES = NUM_OBJECTS - NUM_BUBBLES;
const MAX_BOUNCES = 4;

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
const debugBubbleCount = addDebugElement({ label: "🫧" }).inner;
debugBubbleCount.innerText = `${NUM_BUBBLES} bubbles`;
const debugTriangleCount = addDebugElement({ label: "🔺" }).inner;
debugTriangleCount.innerText = `${NUM_TRIANGLES} triangles`;

//// Assets

const assets = await loadAssets(config.resources);

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

const { view: cubemapView, sampler: cubemapSampler } = await webgpu.createTextureViewSampler(assets.skyImages, {
  textureViewDescriptor: { dimension: "cube" },
});

//// Scene

const camera = new FirstPersonCamera({ debug: true, moveSpeed: 0.4, flipY: true });
camera.setPosition(-30, 0, 0);
camera.storage.main = [camera.position, MAX_BOUNCES, camera.forward, NUM_OBJECTS, camera.scaledRight, 0, camera.scaledUp, 0];

const scene = new BoundingVolumeHierarchyStructure();
for (let i = 0; i < NUM_BUBBLES; i++) {
  const sphere = new SphericalNode({
    center: [getRandom(-50.0, 100.0), getRandom(-50.0, 100.0), getRandom(-50.0, 100.0)],
    color: [getRandom(0.75, 0.9), getRandom(0.75, 0.9), getRandom(0.75, 0.9)],
    radius: getRandom(0.1, 2.9),
  });
  sphere.storage.main = [sphere.center, 0, sphere.attributes.color, sphere.radius, 0, 0, 0, 0, 0, 0, 0, 0];
  scene.addObject(sphere, "objects");
}
for (let i = 0; i < NUM_TRIANGLES; i++) {
  const triangle = new TriangularNode({
    center: [getRandom(-50.0, 100.0), getRandom(-50.0, 100.0), getRandom(-50.0, 100.0)],
    color: [getRandom(0.75, 0.9), getRandom(0.75, 0.9), getRandom(0.75, 0.9)],
    offsets: [
      [getRandom(-3, 6), getRandom(-3, 6), getRandom(-3, 6)],
      [getRandom(-3, 6), getRandom(-3, 6), getRandom(-3, 6)],
      [getRandom(-3, 6), getRandom(-3, 6), getRandom(-3, 6)],
    ],
  });
  triangle.storage.main = [triangle.vertices[0], 1, triangle.vertices[1], 1, triangle.vertices[2], 1, triangle.attributes.color, 1];
  scene.addObject(triangle, "objects");
}
scene.buildBoundingVolumeHierarchy();

//// Buffers

const { buffer: parameterBuffer } = webgpu.setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 64).build();
const { buffer: objectsBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 64 * NUM_OBJECTS).build();
const { buffer: nodeBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 32 * scene.assigned).build();
const { buffer: objectIndicesBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 4 * NUM_OBJECTS).build();

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
  webgpu.queueWriteBuffer(objectsBuffer, 0, scene.getStorageFloat(), 0, 16 * NUM_OBJECTS);
  webgpu.queueWriteBuffer(nodeBuffer, 0, scene.getStorageFloat("nodes", 8 * scene.assigned), 0, 8 * scene.assigned);
  webgpu.queueWriteBuffer(objectIndicesBuffer, 0, scene.indices, 0, NUM_OBJECTS);

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
