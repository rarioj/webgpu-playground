import { WebGPU } from "../../src/system/WebGPU.js";
import { createCanvasElement, createDebugElement } from "../../src/utilities/elements.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { Scene } from "../../src/modules/Scene.js";
import { OBJModelObject } from "../../src/objects/OBJModelObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";
import { config } from "./config.js";

const MAX_BOUNCES = 4;

//// Initialisation

const { canvas } = createCanvasElement({ noWrapper: true, style: { height: "100vh" } });
const webgpu = await WebGPU.init({ deviceDescriptor: { requiredFeatures: ["core-features-and-limits", "bgra8unorm-storage"] } });
const context = webgpu.createCanvasContext(canvas, { format: "bgra8unorm" });

//// Assets

const assets = await loadAssets(config.resources, true);

const screenTextureBuilder = webgpu
  .setupTextureView("Screen texture")
  .setTextureFormat("rgba8unorm")
  .setTextureUsage(GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING);

const { textureView: cubemapView, sampler: cubemapSampler } = webgpu
  .setupTextureView("Cubemap texture")
  .setTextureUsage(GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING)
  .loadBitmaps(assets.skyImages)
  .build({ overrideTextureViewDescriptor: { dimension: "cube" } });

//// Buffers and scene

const scene = new Scene();

const { builder: parameterBufferBuilder, buffer: parameterBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(32))
  .build();

const statue = new OBJModelObject(assets.statueObj.data, { parseImmediately: false, useTexture: false, useNormal: true, useBVH: true });
statue.setEulers(180, 0, 0);
statue.setScale(config.statueScale[0], config.statueScale[1], config.statueScale[2]);
statue.inversedMatrix = parameterBufferBuilder.dataPointer(16);
statue.addFaceDataCallback = (cache, data, tokens) => {
  const vtn = tokens.split("/"); // v//vn
  const vertices = cache.vertices[parseInt(vtn[0]) - 1]; // v
  const normals = cache.normals[parseInt(vtn[2]) - 1]; // vn

  // v
  data.push(vertices[0]);
  data.push(vertices[1]);
  data.push(vertices[2]);
  data.push(0);
  // vn
  data.push(normals[0]);
  data.push(normals[1]);
  data.push(normals[2]);
  data.push(0);

  return vertices;
};
statue.postProcessTriangleCallback = (object, vertices) => {
  object.bvh.addNodeFromVertices(vertices);

  // color
  object.vertexData.push(1.0);
  object.vertexData.push(1.0);
  object.vertexData.push(1.0);
  object.vertexData.push(0);
};
statue.parse();
statue.bvh.build();
scene.addObject(statue);

const camera = new CameraObject({ width: canvas.width, height: canvas.height });
camera.position = parameterBufferBuilder.dataPointer(0, 3);
camera.forward = parameterBufferBuilder.dataPointer(4, 7);
camera.scaledRight = parameterBufferBuilder.dataPointer(8, 11);
parameterBufferBuilder.data[11] = MAX_BOUNCES;
camera.scaledUp = parameterBufferBuilder.dataPointer(12, 15);
parameterBufferBuilder.data[15] = statue.bvh.outputNodes.length;
camera.setPosition(-15, 0, 0);
camera.updateProjectionMatrix();
scene.addObject(camera);

const fpc = new FirstPersonControl(camera, context.canvas, { debug: true, moveSpeed: 0.4, orientSpeed: 0.25, flipY: true });

const { builder: objectIndicesBufferBuilder, buffer: objectIndicesBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setData(statue.bvh.indices)
  .build();

const { builder: objectsBufferBuilder, buffer: objectsBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(statue.vertexData))
  .build();

const { builder: nodeBufferBuilder, buffer: nodeBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(8 * statue.bvh.assigned))
  .build();
for (let i = 0; i < statue.bvh.assigned; i++) {
  nodeBufferBuilder.data.set(statue.bvh.outputNodes[i].data, i * 8);
}

statue.addUpdateCallback(() => {
  statue.updateModelMatrix();
  statue.eulers[2]++;
  statue.eulers[2] = statue.eulers[2] % 360;
});

camera.addUpdateCallback(() => {
  camera.updateOrthonormalVectors();
  camera.updateViewMatrix();
  camera.move();
});

scene.addUpdateEvent(() => {
  parameterBufferBuilder.writeDataToBuffer();
});

objectsBufferBuilder.writeDataToBuffer();
objectIndicesBufferBuilder.writeDataToBuffer();
nodeBufferBuilder.writeDataToBuffer();

const debugPerformance = createDebugElement({ label: "⏱️" }).content;
const debugFramePerSec = createDebugElement({ label: "🏃‍♂️" }).content;
const debugSphereCount = createDebugElement({ label: "🔺" }).content;
debugSphereCount.innerText = `${statue.bvh.outputNodes.length} triangles`;

//// Bind groups

const screenBindGroupBuilder = webgpu.setupBindGroup("Screen fragment").addTexture(null, GPUShaderStage.FRAGMENT).addSampler(null, GPUShaderStage.FRAGMENT);

const raytracerBindGroupBuilder = webgpu
  .setupBindGroup()
  .addStorageTexture(null, GPUShaderStage.COMPUTE, {
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
  .setupPipeline()
  .addBindGroupLayout(screenBindGroupBuilder.bindGroupDescriptor.layout)
  .useShaderCode(assets.shaderCode.data)
  .setVertexShader()
  .setFragmentShader({ targets: [{ format: context.getConfiguration().format }] })
  .setRenderPrimitive({ topology: "triangle-list" })
  .buildAsync();

const { pipeline: raytracerPipeline } = await webgpu
  .setupPipeline()
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

  scene.play();

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
