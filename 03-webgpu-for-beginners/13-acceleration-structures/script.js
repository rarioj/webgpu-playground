import { WebGPUWrapper } from "./library/core/WebGPUWrapper.js";
import { loadResources, createDebugElement } from "./library/helper/utility.js";
import { Scene } from "./Scene.js";

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
const resources = await loadResources([
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

const sphereCount = 8192;
const scene = new Scene(sphereCount);
const debugPerformance = createDebugElement({ label: "⏱️ " }).inner;
const debugFramePerSec = createDebugElement({ label: "🏃‍♂️ " }).inner;
const debugSphereCount = createDebugElement({ label: "🏀 " }).inner;
debugSphereCount.innerText = `${sphereCount} spheres`;

/*
 * Buffers
 * =======
 */

const { buffer: parameterBuffer } = webgpu.setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 64).build();
const { buffer: sphereBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 32 * scene.sphereCount).build();
const { buffer: nodeBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 32 * scene.nodeUsed).build();
const { buffer: sphereIndexBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 4 * scene.sphereCount).build();

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
  .addBuffer(sphereBuffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .addBuffer(nodeBuffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .addBuffer(sphereIndexBuffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
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
    0.0, // padding
    scene.camera.forward[0],
    scene.camera.forward[1],
    scene.camera.forward[2],
    0.0, // padding
    scene.camera.right[0],
    scene.camera.right[1],
    scene.camera.right[2],
    0.0, // padding
    scene.camera.up[0],
    scene.camera.up[1],
    scene.camera.up[2],
    scene.sphereCount,
  ]);

  const sphereData = new Float32Array(8 * scene.sphereCount);
  for (let i = 0; i < scene.sphereCount; i++) {
    sphereData[8 * i] = scene.spheres[i].center[0];
    sphereData[8 * i + 1] = scene.spheres[i].center[1];
    sphereData[8 * i + 2] = scene.spheres[i].center[2];
    sphereData[8 * i + 3] = 0.0; // padding;
    sphereData[8 * i + 4] = scene.spheres[i].color[0];
    sphereData[8 * i + 5] = scene.spheres[i].color[1];
    sphereData[8 * i + 6] = scene.spheres[i].color[2];
    sphereData[8 * i + 7] = scene.spheres[i].radius;
  }

  const nodeData = new Float32Array(8 * scene.nodeUsed);
  for (let i = 0; i < scene.nodeUsed; i++) {
    nodeData[8 * i] = scene.nodes[i].minCorner[0];
    nodeData[8 * i + 1] = scene.nodes[i].minCorner[1];
    nodeData[8 * i + 2] = scene.nodes[i].minCorner[2];
    nodeData[8 * i + 3] = scene.nodes[i].leftChild;
    nodeData[8 * i + 4] = scene.nodes[i].maxCorner[0];
    nodeData[8 * i + 5] = scene.nodes[i].maxCorner[1];
    nodeData[8 * i + 6] = scene.nodes[i].maxCorner[2];
    nodeData[8 * i + 7] = scene.nodes[i].sphereCount;
  }

  const sphereIndexData = new Float32Array(scene.sphereCount);
  for (let i = 0; i < scene.sphereCount; i++) {
    sphereIndexData[i] = scene.sphereIndices[i];
  }

  const startTime = performance.now();

  webgpu
    .setupEncoder("Main command encoder")

    // Writing buffers
    .queueBuffer(parameterBuffer, 0, parameterData, 0, 16)
    .queueBuffer(sphereBuffer, 0, sphereData, 0, 8 * scene.spheres.length)
    .queueBuffer(nodeBuffer, 0, nodeData, 0, 8 * scene.nodeUsed)
    .queueBuffer(sphereIndexBuffer, 0, sphereIndexData, 0, scene.spheres.length)

    // Starting compute pass encoder
    .beginComputePass()
    .setPipeline(rayTracingPipeline)
    .setBindGroup(0, rayTracingBindGroup)
    .dispatchWorkgroups(Math.ceil(canvas.width / 16), Math.ceil(canvas.height / 16), 1)
    .end()

    // Starting render pass encoder
    .beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
        },
      ],
    })
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
