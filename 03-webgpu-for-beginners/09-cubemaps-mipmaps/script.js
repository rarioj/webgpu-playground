import { WebGPUCore } from "./src/webgpu/WebGPUCore.js";
import { createCanvas } from "./src/helper/elements.js";
import { loadAssets } from "./src/helper/utilities.js";
import { FirstPersonCamera } from "./src/components/FirstPersonCamera.js";
import { BaseModel } from "./src/components/BaseModel.js";
import { OBJModel } from "./src/components/OBJModel.js";
import { BaseScene } from "./src/components/BaseScene.js";
import { assetArray, triangleVertices, tileVertices } from "./config.js";

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
const { context, format } = await webgpu.init();

//// Assets

const assets = await loadAssets(assetArray);
const { view: cubemapView, sampler: cubemapSampler } = await webgpu.createTextureViewSampler(
  [assets.cubemap_px, assets.cubemap_nx, assets.cubemap_py, assets.cubemap_ny, assets.cubemap_pz, assets.cubemap_nz],
  { textureViewDescriptor: { dimension: "cube" } },
);
const {
  view: imageView,
  sampler: imageSampler,
  bindGroupBuilder: fragmentBindGroupBuilder,
} = await webgpu.createTextureViewSampler(assets.image, {
  enableMipmap: true,
  samplerDescriptor: { maxAnisotropy: 4, minFilter: "linear", mipmapFilter: "linear" },
});

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
const statue = new OBJModel(assets.statue, { scale: [0.25, 0.25, 0.25] });
statue.setUpdateCallback((updateObject) => {
  const eulers = updateObject.eulers;
  eulers[2]++;
  eulers[2] = eulers[2] % 360;
  updateObject.setEulers(eulers[0], eulers[1], eulers[2]);
});
scene.addObject(statue, "statue");

//// Buffers

const { buffer: triangleBuffer, bufferLayout: triangleBufferLayout } = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, new Float32Array(triangleVertices))
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();

const { buffer: tileBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, new Float32Array(tileVertices))
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();

const statueData = statue.getStorageFloat("object");
const { buffer: statueBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, statueData)
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();

const { buffer: cameraBuffer } = webgpu.setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 16 * 3).build(); // 4 bytes * 3 types (forward, right, up)

const { buffer: uniformBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 64 * 2) // 4x4 matrix * 2 types (view, projection)
  .build();

const { buffer: objectBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 64 * 1024) // 4x4 matrix * 2^10
  .build();

//// Bind groups

const { bindGroup: fragmentBindGroup, bindGroupLayout: fragmentBindGroupLayout } = fragmentBindGroupBuilder.build();

const { bindGroup: cubemapBindGroup, bindGroupLayout: cubemapBindGroupLayout } = webgpu
  .setupBindGroup()
  .addBuffer(cameraBuffer, GPUShaderStage.VERTEX, { type: "uniform" })
  .addTexture(cubemapView, GPUShaderStage.FRAGMENT, { viewDimension: "cube" })
  .addSampler(cubemapSampler, GPUShaderStage.FRAGMENT)
  .build();

const { bindGroup: vertexBindGroup, bindGroupLayout: vertexBindGroupLayout } = webgpu
  .setupBindGroup()
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX)
  .addBuffer(objectBuffer, GPUShaderStage.VERTEX, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .build();

//// Pipelines

const { state: depthStencilState, attachment: depthStencilAttachment } = webgpu.configureDepthStencil();

const { pipeline: cubemapPipeline } = webgpu
  .setupPipeline()
  .addBindGroupLayout(cubemapBindGroupLayout)
  .setShaderCode(assets.cubemap)
  .setVertexShader("skyVertexMain")
  .setFragmentShader("skyFragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .setDepthStencil(depthStencilState)
  .build();

const { pipeline: standardPipeline } = webgpu
  .setupPipeline()
  .addBindGroupLayout(vertexBindGroupLayout)
  .addBindGroupLayout(fragmentBindGroupLayout)
  .setShaderCode(assets.shader)
  .setVertexShader("vertexMain", { buffers: [triangleBufferLayout] })
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .setDepthStencil(depthStencilState)
  .build();

//// Renderer

function render() {
  scene.update();
  camera.update();
  const sceneData = scene.getStorageFloat();
  const cameraData = camera.getStorageFloat();
  const triangleCount = scene.getTypeCount("triangles");
  const tileCount = scene.getTypeCount("tiles");

  /** @type {GPURenderPassDescriptor} */
  const renderPassDescriptor = {
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
      },
    ],
    depthStencilAttachment,
  };

  webgpu.queueWriteBuffer(objectBuffer, 0, sceneData, 0, sceneData.length);
  webgpu.queueWriteBuffer(uniformBuffer, 0, camera.view);
  webgpu.queueWriteBuffer(uniformBuffer, 64, camera.projection);
  webgpu.queueWriteBuffer(cameraBuffer, 0, cameraData, 0, cameraData.length);

  webgpu
    .setupEncoder()

    // cubemap
    .beginRenderPass(renderPassDescriptor)
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

    .queueSubmit();

  requestAnimationFrame(render);
}

render();
