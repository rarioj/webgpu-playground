import { WebGPUWrapper } from "./library/core/WebGPUWrapper.js";
import { loadResources } from "./library/helper/utility.js";
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

const scene = new Scene();

/*
 * Buffers
 * =======
 */

const { buffer: parameterBuffer } = webgpu.setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 64).build();
const { buffer: sphereBuffer } = webgpu.setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 32 * scene.spheres.length).build();

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
    scene.spheres.length,
  ]);

  const sphereData = new Float32Array(8 * scene.spheres.length);
  for (let i = 0; i < scene.spheres.length; i++) {
    sphereData[8 * i] = scene.spheres[i].center[0];
    sphereData[8 * i + 1] = scene.spheres[i].center[1];
    sphereData[8 * i + 2] = scene.spheres[i].center[2];
    sphereData[8 * i + 3] = 0.0; // padding;
    sphereData[8 * i + 4] = scene.spheres[i].color[0];
    sphereData[8 * i + 5] = scene.spheres[i].color[1];
    sphereData[8 * i + 6] = scene.spheres[i].color[2];
    sphereData[8 * i + 7] = scene.spheres[i].radius;
  }

  webgpu
    .setupEncoder("Main command encoder")

    // Writing buffers
    .queueBuffer(parameterBuffer, 0, parameterData, 0, 16)
    .queueBuffer(sphereBuffer, 0, sphereData, 0, 8 * scene.spheres.length)

    // Starting compute pass encoder
    .beginComputePass()
    .setPipeline(rayTracingPipeline)
    .setBindGroup(0, rayTracingBindGroup)
    .dispatchWorkgroups(Math.ceil(canvas.width / 8), Math.ceil(canvas.height / 8), 1)
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
    .submit();

  requestAnimationFrame(render);
}

render();
