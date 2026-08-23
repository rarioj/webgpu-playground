import { WebGPU } from "../../src/system/WebGPU.js";
import { createCanvasElement, createTweakElement } from "../../src/utilities/elements.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";
import { BoundingVolumeHierarchy } from "../../src/modules/BoundingVolumeHierarchy.js";
import { getRandom } from "../../src/utilities/maths.js";
import { getSphereCorners } from "../../src/utilities/matrices.js";
import { config } from "./config.js";

const NUM_BUBBLES = Math.floor(parseInt(getQueryValue("bubbles", 64)));
const MAX_BOUNCES = 4;

//// Initialisation

const { canvas } = createCanvasElement({ noWrapper: true, style: { height: "100vh" } });
const webgpu = await WebGPU.init({ deviceDescriptor: { requiredFeatures: ["core-features-and-limits", "bgra8unorm-storage"] } });
const context = webgpu.createCanvasContext(canvas, { format: "bgra8unorm" });

const tweak = createTweakElement("Bubbles", `${NUM_BUBBLES}`, { readonly: true });
createTweakElement("FPS", "", { readonly: true });
createTweakElement("Perform.", "", { readonly: true });

//// Assets

const assets = await loadAssets(config.resources, true);

const screenTextureBuilder = webgpu
  .setupTexture("Screen texture")
  .setTextureFormat("rgba8unorm")
  .setTextureUsage(GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING);

const { textureView: cubemapView, sampler: cubemapSampler } = webgpu
  .setupTexture("Cubemap texture")
  .setTextureUsage(GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING)
  .loadBitmapData(assets.skyImages)
  .build({ overrideTextureViewDescriptor: { dimension: "cube" } });

//// Buffers and scene

const parameterBufferBuilder = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  .loadBufferData(new Float32Array(16))
  .build();

const relativePos = NUM_BUBBLES < 100 ? 20 : NUM_BUBBLES < 200 ? 40 : NUM_BUBBLES < 300 ? 60 : 80;
const camera = new CameraObject({ width: canvas.width, height: canvas.height });
camera.position = parameterBufferBuilder.mapData(0, 3);
camera.forward = parameterBufferBuilder.mapData(4, 7);
camera.scaledRight = parameterBufferBuilder.mapData(8, 11);
parameterBufferBuilder.data[11] = MAX_BOUNCES;
camera.scaledUp = parameterBufferBuilder.mapData(12, 15);
parameterBufferBuilder.data[15] = NUM_BUBBLES;
camera.setPosition(-relativePos * 4, 0, 0);
camera.updateProjectionMatrix();

const fpc = new FirstPersonControl(camera, context.canvas, { debug: true, moveSpeed: 0.4, orientSpeed: 0.25, flipY: true });

const sphereIndicesBufferBuilder = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .loadBufferData(new Uint32Array(NUM_BUBBLES))
  .build();

const bvh = new BoundingVolumeHierarchy();
bvh.indices = sphereIndicesBufferBuilder.mapData();

const spheresBufferBuilder = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .loadBufferData(new Float32Array(8 * NUM_BUBBLES))
  .build();

for (let i = 0; i < NUM_BUBBLES; i++) {
  const center = [getRandom(-relativePos, relativePos), getRandom(-relativePos, relativePos), getRandom(-relativePos, relativePos)];
  const color = [getRandom(0.75, 0.9), getRandom(0.75, 0.9), getRandom(0.75, 0.9)];
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

const nodeBufferBuilder = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .loadBufferData(new Float32Array(8 * bvh.assigned))
  .build();
for (let i = 0; i < bvh.assigned; i++) {
  nodeBufferBuilder.setData(bvh.outputNodes[i].data, i * 8);
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

const screenBindGroupBuilder = webgpu.setupBindGroup("Screen fragment").addTexture(null, GPUShaderStage.FRAGMENT).addSampler(null, GPUShaderStage.FRAGMENT);

const raytracerBindGroupBuilder = webgpu
  .setupBindGroup("Ray tracing")
  .addStorageTexture(null, GPUShaderStage.COMPUTE, {
    access: "write-only",
    format: "rgba8unorm",
    viewDimension: "2d",
  })
  .addBuffer(parameterBufferBuilder.buffer, GPUShaderStage.COMPUTE, {
    type: "uniform",
  })
  .addBuffer(spheresBufferBuilder.buffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .addBuffer(nodeBufferBuilder.buffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .addBuffer(sphereIndicesBufferBuilder.buffer, GPUShaderStage.COMPUTE, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .addTexture(cubemapView, GPUShaderStage.COMPUTE, {
    viewDimension: "cube",
  })
  .addSampler(cubemapSampler, GPUShaderStage.COMPUTE);

const sceneResize = (width, height) => {
  camera.resize(width, height);
  screenTextureBuilder.setTextureSize(canvas.width, canvas.height).build();
  screenBindGroupBuilder.setResource(0, screenTextureBuilder.textureView);
  screenBindGroupBuilder.setResource(1, screenTextureBuilder.sampler);
  raytracerBindGroupBuilder.setResource(0, screenTextureBuilder.textureView);
  screenBindGroupBuilder.build();
  raytracerBindGroupBuilder.build();
};
sceneResize(canvas.width, canvas.height);
webgpu.observeCanvasResize(canvas, sceneResize);

//// Pipelines

const { pipeline: screenPipeline } = await webgpu
  .setupPipeline("Screen pipeline")
  .addBindGroupLayout(screenBindGroupBuilder.bindGroupDescriptor.layout)
  .useShaderCode(assets.shaderCode.data)
  .setVertexShader()
  .setFragmentShader({ targets: [{ format: context.getConfiguration().format }] })
  .setRenderPrimitive({ topology: "triangle-list" })
  .buildAsync();

const { pipeline: raytracerPipeline } = await webgpu
  .setupPipeline("Raytracer pipeline")
  .addBindGroupLayout(raytracerBindGroupBuilder.bindGroupDescriptor.layout)
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
    .setBindGroup(0, raytracerBindGroupBuilder.bindGroup)
    .dispatchWorkgroups(Math.ceil(canvas.width / 16), Math.ceil(canvas.height / 16), 1)
    .end()

    // render pass
    .beginRenderPass(renderPassDescriptor)
    .setPipeline(screenPipeline)
    .setBindGroup(0, screenBindGroupBuilder.bindGroup)
    .draw(6, 1, 0, 0)
    .end()

    .submitCommandBuffer(() => {
      const endTime = performance.now();
      tweak["Perform."] = `${(endTime - startTime).toFixed(1)} ms`;
    });

  fpsCount++;
  if (startTime - fpsStart >= 1000) {
    fpsCurrent = Math.round((fpsCount * 1000) / (startTime - fpsStart));
    fpsCount = 0;
    fpsStart = startTime;
    tweak.FPS = `${fpsCurrent}`;
  }

  requestAnimationFrame(render);
}

render();
