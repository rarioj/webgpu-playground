import { WebGPUWrapper } from "./library/core/WebGPUWrapper.js";
import { getQueryValue, loadResources, createDebugElement } from "./library/helper/utility.js";
import { config } from "./config.js";
import { Scene } from "./Scene.js";
import { Sphere } from "./Sphere.js";
import { Triangle } from "./Triangle.js";

/*
 * Initialisation
 * ==============
 */

// WebGPU initialisation
const canvas = document.querySelector("canvas");
const webgpu = new WebGPUWrapper(canvas);
const { device, context, format } = await webgpu.init({
  deviceDescriptor: {
    requiredFeatures: ["core-features-and-limits", "bgra8unorm-storage"],
  },
  canvasContextConfig: {
    format: "bgra8unorm",
  },
});

// Fetch all resources
const resources = await loadResources(config.resources);

const objectCount = parseInt(getQueryValue("object", 128));
const scene = new Scene(objectCount);
const debugPerformance = createDebugElement({ label: "⏱️ " }).inner;
const debugFramePerSec = createDebugElement({ label: "🏃‍♂️ " }).inner;
const debugSphereCount = createDebugElement({ label: "📐 " }).inner;
debugSphereCount.innerText = `${objectCount} objects`;

/*
 * Buffers
 * =======
 */

const { buffer: parameterBuffer } = webgpu.setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 64).build();
const { buffer: objectListBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 64 * scene.objectList.length).build();
const { buffer: nodeBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 32 * scene.nodeUsed).build();
const { buffer: objectIndexBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 4 * scene.objectIndices.length).build();

/*
 * Bind groups
 * ===========
 */

// Screen texture view sampler + bind group and layout
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
const { bindGroupLayout: screenBindGroupLayout, bindGroup: screenBindGroup } = screenBindGroupBuilder
  .setLabel("Screen bind group", "Screen bind group layout")
  .build();

// Sky cubemap
const { view: skyView, sampler: skySampler } = await webgpu.createTextureViewSampler(resources.skyImages, {
  textureViewDescriptor: { dimension: "cube" },
});

// Ray tracing bind group and layout
const { bindGroupLayout: rayTracingBindGroupLayout, bindGroup: rayTracingBindGroup } = webgpu
  .setupBindGroup()
  .setLabel("Ray tracing bind group", "Ray tracing bind group layout")
  .addStorageTexture(screenView, GPUShaderStage.COMPUTE, {
    access: "write-only",
    format: "rgba8unorm",
    viewDimension: "2d",
  })
  .addBuffer(parameterBuffer, GPUShaderStage.COMPUTE, {
    type: "uniform",
  })
  .addBuffer(objectListBuffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .addBuffer(nodeBuffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .addBuffer(objectIndexBuffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .addTexture(skyView, GPUShaderStage.COMPUTE, {
    viewDimension: "cube",
  })
  .addSampler(skySampler, GPUShaderStage.COMPUTE)
  .build();

/*
 * Pipelines
 * =========
 */

// Screen pipeline and layout
const { pipeline: screenPipeline } = webgpu
  .setupPipeline()
  .setLabel("Screen pipeline", "Screen pipeline layout")
  .addBindGroupLayout(screenBindGroupLayout)
  .setShaderCode(resources.shaderCode)
  .setVertexShader("vertexMain")
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .build();

// Ray tracing pipeline and layout
const { pipeline: rayTracingPipeline } = webgpu
  .setupPipeline()
  .setLabel("Ray tracing pipeline", "Ray tracing pipeline layout")
  .addBindGroupLayout(rayTracingBindGroupLayout)
  .setShaderCode(resources.raytracerCode)
  .setComputeShader("computeMain")
  .build();

/*
 * Renderer
 * ========
 */

const maxBounces = 4;
let fpsStart = performance.now();
let fpsCount = 0;
let fpsCurrent = 0;

/**
 *
 */
function render() {
  const parameterData = new Float32Array([
    scene.camera.position[0],
    scene.camera.position[1],
    scene.camera.position[2],
    maxBounces,
    scene.camera.forward[0],
    scene.camera.forward[1],
    scene.camera.forward[2],
    scene.objectList.length,
    scene.camera.right[0],
    scene.camera.right[1],
    scene.camera.right[2],
    0.0, // padding
    scene.camera.up[0],
    scene.camera.up[1],
    scene.camera.up[2],
    0.0, // padding
  ]);

  const nodeData = new Float32Array(8 * scene.nodeUsed);
  for (let i = 0; i < scene.nodeUsed; i++) {
    nodeData[8 * i] = scene.nodes[i].minCorner[0];
    nodeData[8 * i + 1] = scene.nodes[i].minCorner[1];
    nodeData[8 * i + 2] = scene.nodes[i].minCorner[2];
    nodeData[8 * i + 3] = scene.nodes[i].leftChild;
    nodeData[8 * i + 4] = scene.nodes[i].maxCorner[0];
    nodeData[8 * i + 5] = scene.nodes[i].maxCorner[1];
    nodeData[8 * i + 6] = scene.nodes[i].maxCorner[2];
    nodeData[8 * i + 7] = scene.nodes[i].primitiveCount;
  }

  const objectIndexData = new Uint32Array(scene.objectIndices.length);
  for (let i = 0; i < scene.objectIndices.length; i++) {
    objectIndexData[i] = scene.objectIndices[i];
  }

  const objectListData = new Float32Array(16 * scene.objectList.length);
  for (let i = 0; i < scene.objectList.length; i++) {
    const objectInstance = scene.objectList[i];
    if (objectInstance instanceof Sphere) {
      objectListData[16 * i] = objectInstance.center[0];
      objectListData[16 * i + 1] = objectInstance.center[1];
      objectListData[16 * i + 2] = objectInstance.center[2];
      objectListData[16 * i + 3] = 0.0; // padding; 0 = circle, 1 = triangle
      objectListData[16 * i + 4] = objectInstance.color[0];
      objectListData[16 * i + 5] = objectInstance.color[1];
      objectListData[16 * i + 6] = objectInstance.color[2];
      objectListData[16 * i + 7] = objectInstance.radius;
      for (let pad = 8; pad < 16; pad++) {
        objectListData[16 * i + pad] = 0.0; // padding; 0 = circle, 1 = triangle
      }
    } else if (objectInstance instanceof Triangle) {
      for (let corner = 0; corner < 3; corner++) {
        for (let dimension = 0; dimension < 3; dimension++) {
          objectListData[16 * i + 4 * corner + dimension] = objectInstance.corners[corner][dimension];
        }
        objectListData[16 * i + 4 * corner + 3] = 1.0; // padding; 0 = circle, 1 = triangle
      }
      for (let channel = 0; channel < 3; channel++) {
        objectListData[16 * i + 12 + channel] = objectInstance.color[channel];
      }
      objectListData[16 * i + 15] = 1.0; // padding; 0 = circle, 1 = triangle
    }
  }

  const colorAttachments = [
    {
      view: context.getCurrentTexture().createView(),
      loadOp: "clear",
      storeOp: "store",
      clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
    },
  ];

  const startTime = performance.now();

  webgpu
    .setupEncoder("Main command encoder")

    // Writing buffers
    .queueBuffer(parameterBuffer, 0, parameterData, 0, 16)
    .queueBuffer(objectListBuffer, 0, objectListData, 0, 16 * scene.objectList.length)
    .queueBuffer(nodeBuffer, 0, nodeData, 0, 8 * scene.nodeUsed)
    .queueBuffer(objectIndexBuffer, 0, objectIndexData, 0, scene.objectIndices.length)

    // Starting compute pass encoder
    .beginComputePass()
    .setPipeline(rayTracingPipeline)
    .setBindGroup(0, rayTracingBindGroup)
    .dispatchWorkgroups(Math.ceil(canvas.width / 16), Math.ceil(canvas.height / 16), 1)
    .end()

    // Starting render pass encoder
    .beginRenderPass({ colorAttachments })
    .setPipeline(screenPipeline)
    .setBindGroup(0, screenBindGroup)
    .draw(6, 1, 0, 0)
    .end()

    // Submit the command buffer
    .submit()
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
