import { WebGPUCore } from "./src/webgpu/WebGPUCore.js";
import { createCanvas } from "./src/helper/elements.js";
import { loadAssets } from "./src/helper/utilities.js";
import { FirstPersonCamera } from "./src/components/FirstPersonCamera.js";
import { BaseModel } from "./src/components/BaseModel.js";
import { BaseScene } from "./src/components/BaseScene.js";
import { config } from "./config.js";
import { parseOBJCode } from "./src/helper/parser.js";

//// Initialisation

const canvas = createCanvas({
  container: document.querySelector("article"),
  width: 800,
  height: 450,
  style: {
    outline: "1px solid black",
  },
});
const webgpu = new WebGPUCore(canvas);
const { context, format } = await webgpu.init();

//// Scene

const camera = new FirstPersonCamera({ canvas, debug: true });
camera.setPosition(-7, -0.5, 0.5);
// construct raw array data
camera.storage.main = [camera.forward, 0, camera.scaledRight, 0, camera.scaledUp, 0];

const scene = new BaseScene();
for (let i = -5; i < 5; i++) {
  const model = new BaseModel();
  model.setPosition(2, i, 0.5);
  model.setUpdateCallback((updateObject) => {
    const eulers = updateObject.eulers;
    eulers[2]++;
    eulers[2] = eulers[2] % 360;
    updateObject.setEulers(eulers[0], eulers[1], eulers[2]);
  });
  scene.addObject(model, "triangles");
}
for (let i = -8; i < 8; i++) {
  for (let j = -8; j < 8; j++) {
    const model = new BaseModel();
    model.setPosition(i, j, 0);
    scene.addObject(model, "tiles");
  }
}
const statue = new BaseModel({ scale: [0.6, 0.6, 0.6] });
statue.setUpdateCallback((updateObject) => {
  const eulers = updateObject.eulers;
  eulers[2]++;
  eulers[2] = eulers[2] % 360;
  updateObject.setEulers(eulers[0], eulers[1], eulers[2]);
});
scene.addObject(statue, "statue");

//// Assets

const assets = await loadAssets(config.assetArray);
const { bindGroupBuilder: cubemapBindGroupBuilder } = await webgpu.createTextureViewSampler(assets.skyImages, { textureViewDescriptor: { dimension: "cube" } });
const { bindGroupBuilder: fragmentBindGroupBuilder } = await webgpu.createTextureViewSampler(assets.assetImages, {
  enableMipmap: true,
  samplerDescriptor: { maxAnisotropy: 4, minFilter: "linear", mipmapFilter: "linear" },
});
const { bindGroupBuilder: hudBindGroupBuilder } = await webgpu.createTextureViewSampler([assets.hudImage]);
const { view: strobeLightView, bindGroupBuilder: strobeLightBindGroupBuilder } = await webgpu.createTextureViewSampler(null, {
  textureDescriptor: {
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  },
});

//// Buffers

const { buffer: triangleBuffer, bufferLayout: triangleBufferLayout } = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, new Float32Array(config.triangleVertices))
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();

const { buffer: tileBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, new Float32Array(config.tileVertices))
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();

const statueData = parseOBJCode(assets.statueObj, { transform: statue.matrix });
const { buffer: statueBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, new Float32Array(statueData))
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();

const { buffer: cameraBuffer } = webgpu.setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 4 * 4 * 3).build(); // 4 bytes * 3 types (forward, right, up)

const { buffer: uniformBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 4 * 4 * 4 * 2) // 4-bytes * 4x4 matrix * 2 types (projection, view)
  .build();

const { buffer: objectBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 64 * 1024) // 4-bytes * 4x4 matrix * 2^10 (storage)
  .build();

const { buffer: timeBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 4) // 4-bytes integer
  .build();

//// Bind groups

const { bindGroup: fragmentBindGroup, bindGroupLayout: fragmentBindGroupLayout } = fragmentBindGroupBuilder.build();

const { bindGroup: cubemapBindGroup, bindGroupLayout: cubemapBindGroupLayout } = cubemapBindGroupBuilder
  .addBuffer(cameraBuffer, GPUShaderStage.VERTEX, { type: "uniform" })
  .build();

const { bindGroup: vertexBindGroup, bindGroupLayout: vertexBindGroupLayout } = webgpu
  .setupBindGroup()
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX)
  .addBuffer(objectBuffer, GPUShaderStage.VERTEX, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .build();

const { bindGroup: strobeLightBindGroup, bindGroupLayout: strobeLightBindGroupLayout } = strobeLightBindGroupBuilder
  .addBuffer(timeBuffer, GPUShaderStage.FRAGMENT, { type: "uniform" })
  .build();

const { bindGroup: hudBindGroup, bindGroupLayout: hudBindGroupLayout } = hudBindGroupBuilder.build();

//// Pipelines

const { state: depthStencilState, attachment: depthStencilAttachment } = webgpu.configureDepthStencil();

const { pipeline: cubemapPipeline } = webgpu
  .setupPipeline()
  .addBindGroupLayout(cubemapBindGroupLayout)
  .setShaderCode(assets.cubemapCode)
  .setVertexShader("vertexMain")
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .setDepthStencil(depthStencilState)
  .build();

const { pipeline: standardPipeline } = webgpu
  .setupPipeline()
  .addBindGroupLayout(vertexBindGroupLayout)
  .addBindGroupLayout(fragmentBindGroupLayout)
  .setShaderCode(assets.shaderCode)
  .setVertexShader("vertexMain", { buffers: [triangleBufferLayout] })
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .setDepthStencil(depthStencilState)
  .build();

const { pipeline: strobeLightPipeline } = webgpu
  .setupPipeline()
  .addBindGroupLayout(strobeLightBindGroupLayout)
  .setShaderCode(assets.strobeLightCode)
  .setVertexShader("vertexMain")
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .build();

// enabling transparent HUD
const blend = {
  color: {
    operation: "add",
    srcFactor: "src-alpha",
    dstFactor: "one-minus-src-alpha",
  },
  alpha: {
    operation: "add",
    srcFactor: "one",
    dstFactor: "zero",
  },
};

const { pipeline: hudPipeline } = webgpu
  .setupPipeline()
  .addBindGroupLayout(hudBindGroupLayout)
  .setShaderCode(assets.hudCode)
  .setVertexShader("vertexMain")
  .setFragmentShader("fragmentMain", { targets: [{ format, blend }] })
  .setPrimitive({ topology: "triangle-list" })
  .build();

//// Renderer

const startTime = performance.now();

/**
 *
 */
function render() {
  const currentTime = performance.now();
  const elapsedTime = (currentTime - startTime) / 1000;

  scene.update();
  camera.update();
  const sceneData = scene.getStorageFloat();
  const cameraData = camera.getStorageFloat();
  const timeData = new Float32Array([elapsedTime]);
  const triangleCount = scene.getTypeCount("triangles");
  const tileCount = scene.getTypeCount("tiles");

  /** @type {GPURenderPassDescriptor} */
  const strobeLightRenderPassDescriptor = {
    colorAttachments: [
      {
        view: strobeLightView,
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
      },
    ],
    depthStencilAttachment,
  };

  /** @type {GPURenderPassDescriptor} */
  const defaultRenderPassDescriptor = {
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
      },
    ],
  };

  webgpu.queueWriteBuffer(objectBuffer, 0, sceneData, 0, sceneData.length);
  webgpu.queueWriteBuffer(uniformBuffer, 0, camera.view);
  webgpu.queueWriteBuffer(uniformBuffer, 64, camera.projection);
  webgpu.queueWriteBuffer(cameraBuffer, 0, cameraData, 0, cameraData.length);
  webgpu.queueWriteBuffer(timeBuffer, 0, timeData);

  webgpu
    .setupEncoder()

    // cubemap
    .beginRenderPass(strobeLightRenderPassDescriptor)
    .setPipeline(cubemapPipeline)
    .setBindGroup(0, cubemapBindGroup)
    .draw(6, 1)
    // fragments
    .setPipeline(standardPipeline)
    .setBindGroup(0, vertexBindGroup)
    // triangles
    .setVertexBuffer(0, triangleBuffer)
    .setBindGroup(1, fragmentBindGroup)
    .draw(3, triangleCount, 0, 0)
    // tiles
    .setVertexBuffer(0, tileBuffer)
    .setBindGroup(1, fragmentBindGroup)
    .draw(6, tileCount, 0, triangleCount)
    // statue
    .setVertexBuffer(0, statueBuffer)
    .setBindGroup(1, fragmentBindGroup)
    .draw(statueData.length / 5, 1, 0, triangleCount + tileCount)
    .end()

    // switch render pass to render strobe light and the hud
    .beginRenderPass(defaultRenderPassDescriptor)
    // strobe light layer
    .setPipeline(strobeLightPipeline)
    .setBindGroup(0, strobeLightBindGroup)
    .draw(6, 1, 0, 0)
    // hud layer
    .setPipeline(hudPipeline)
    .setBindGroup(0, hudBindGroup)
    .draw(6, 1, 0, 0)
    .end()

    .queueSubmit();

  requestAnimationFrame(render);
}

render();
