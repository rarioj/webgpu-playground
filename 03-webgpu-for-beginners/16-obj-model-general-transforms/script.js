import { WebGPUCore } from "../../src/webgpu/WebGPUCore.js";
import { createCanvas, addDebugElement } from "../../src/helper/elements.js";
import { loadAssets } from "../../src/helper/utilities.js";
import { config } from "./config.js";
import { FirstPersonCamera } from "../../src/components/FirstPersonCamera.js";
import { OBJModel } from "../../src/components/OBJModel.js";
import { BaseScene } from "../../src/components/BaseScene.js";
import { BaseModel } from "../../src/components/BaseModel.js";

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

const scene = new BaseScene();
const statue = new OBJModel(assets.statueObj, {
  eulers: [180, 0, 0],
  scale: config.statueScale,
  useTexture: false,
  useNormal: true,
  applyBVH: true,
  nodePostCreationCallback: (node) => {
    node.storage.main = [
      node.vertices[0],
      0,
      node.normals[0],
      0,
      node.vertices[1],
      0,
      node.normals[1],
      0,
      node.vertices[2],
      0,
      node.normals[2],
      0,
      node.attributes.color,
      0,
    ];
  },
});
statue.setUpdateCallback((updateObject) => {
  updateObject.eulers[2] += 2;
  updateObject.eulers[2] %= 360;
});
scene.addObject(statue);

const camera = new FirstPersonCamera({ debug: true, moveSpeed: 0.4, flipY: true });
camera.setPosition(-10.0, 0.0, -1.0);
camera.storage.main = [camera.position, 0, camera.forward, 0, camera.scaledRight, MAX_BOUNCES, camera.scaledUp, statue.bvh.objects.length];

const debugPerformance = addDebugElement({ label: "⏱️" }).inner;
const debugFramePerSec = addDebugElement({ label: "🏃‍♂️" }).inner;
const debugSphereCount = addDebugElement({ label: "🔺" }).inner;
debugSphereCount.innerText = `${statue.bvh?.nodes?.length} triangles`;

//// Buffers

const { buffer: parameterBuffer } = webgpu.setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 128).build();
const { buffer: objectsBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 112 * statue.bvh.objects.length).build();
const { buffer: nodeBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 32 * statue.bvh.assigned).build();
const { buffer: objectIndicesBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 4 * statue.bvh.indices.length).build();

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
  webgpu.queueWriteBuffer(parameterBuffer, 64, statue.inversedMatrix);
  webgpu.queueWriteBuffer(objectsBuffer, 0, statue.bvh.getStorageFloat(), 0, 28 * statue.bvh.objects.length);
  webgpu.queueWriteBuffer(nodeBuffer, 0, statue.bvh.getStorageFloat("nodes", 8 * statue.bvh.assigned), 0, 8 * statue.bvh.assigned);
  webgpu.queueWriteBuffer(objectIndicesBuffer, 0, statue.bvh.indices, 0, statue.bvh.indices.length);

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
