import { WebGPU } from "../../src/system/WebGPU.js";
import { createCanvasElement } from "../../src/utilities/elements.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { Scene } from "../../src/modules/Scene.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { OBJModelObject } from "../../src/objects/OBJModelObject.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";
import { config } from "./config.js";

//// Initialisation

const { canvas } = createCanvasElement({
  container: document.querySelector("article"),
  width: 800,
  height: 450,
  style: {
    outline: "1px solid black",
  },
});
const webgpu = await WebGPU.init();
const context = webgpu.createCanvasContext(canvas);

//// Assets and textures

const assets = await loadAssets(config.assetArray, true);

const { textureView: cubemapView, sampler: cubemapSampler } = webgpu
  .setupTextureView(context, "Cubemap")
  .setTextureUsage(GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT)
  .loadBitmaps(assets.skyImages)
  .build({ createSampler: true, overrideTextureViewDescriptor: { dimension: "cube" } });

const { textureView: imageView, sampler: imageSampler } = webgpu
  .setupTextureView(context, "Images")
  .setTextureUsage(GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT)
  .loadBitmaps(assets.assetImages)
  .build({ enableMipmap: true, overrideSamplerDescriptor: { maxAnisotropy: 4 } });

const { textureView: hudView, sampler: hudSampler } = webgpu
  .setupTextureView(context, "HUD")
  .setTextureUsage(GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT)
  .loadBitmaps([assets.hudImage])
  .build();

const { textureView: strobeLightView, sampler: strobeLightSampler } = webgpu
  .setupTextureView(context, "Strobe light")
  .setTextureUsage(GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT)
  .build();

const { textureView: weaponView, sampler: weaponSampler } = webgpu
  .setupTextureView(context, "Weapon layer")
  .setTextureUsage(GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT)
  .build();

const { textureView: gunSkinView, sampler: gunSkinSampler } = webgpu
  .setupTextureView(context, "Gun")
  .setTextureUsage(GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT)
  .loadBitmaps([assets.gunImage])
  .build({ overrideSamplerDescriptor: { maxAnisotropy: 4 } });

const { depthStencilState, depthStencilAttachment } = webgpu.setupTextureView(context).buildDepthStencil();

//// Buffers

const { buffer: triangleBuffer, vertexBufferLayout: triangleBufferLayout } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(config.triangleVertices))
  .addVertexAttribute("float32x3") // x, y, z
  .addVertexAttribute("float32x2") // u, v
  .build();

const { buffer: tileBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(config.tileVertices))
  .addVertexAttribute("float32x3") // x, y, z
  .addVertexAttribute("float32x2") // u, v
  .build();

const statue = new OBJModelObject(assets.statueObj.data);
statue.setScale(0.25, 0.25, 0.25);
const { buffer: statueBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(statue.vertexData))
  .addVertexAttribute("float32x3") // x, y, z
  .addVertexAttribute("float32x2") // u, v
  .build();

const { builder: cameraBufferBuilder, buffer: cameraBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(4 * 3)) // 4 bytes * 3 types (forward, right, up)
  .build();

const { builder: uniformBufferBuilder, buffer: uniformBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(16 * 2)) // 4x4 matrix * 2 types (view, projection)
  .build();

const triangleCount = 10;
const tileCount = 256;
const statueCount = 1;
const { builder: objectBufferBuilder, buffer: objectBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(16 * (triangleCount + tileCount + statueCount))) // 4x4 matrix * (10 triangles + 256 tiles + 1 statue)
  .build();

const { builder: timeBufferBuilder, buffer: timeBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(1))
  .build();

const gun = new OBJModelObject(assets.gunObj.data, {
  transform: new BaseObject().setPosition(0.8, -1.75, -1.0).setScale(0.25, 0.25, 0.25).updateModelMatrix().modelMatrix,
  useNormal: true,
});
const { buffer: gunBuffer, vertexBufferLayout: gunBufferLayout } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(gun.vertexData))
  .addVertexAttribute("float32x3") // x, y, z
  .addVertexAttribute("float32x2") // u, v
  .addVertexAttribute("float32x3") // nx, ny, nz
  .build();

//// Scene and event

const scene = new Scene();
scene.elapsed = timeBufferBuilder.dataPointer();

const camera = new CameraObject(context);
camera.setPosition(-7, -0.5, 0.5);
camera.viewMatrix = uniformBufferBuilder.dataPointer(0, 16);
camera.projectionMatrix = uniformBufferBuilder.dataPointer(16, 32);
camera.forward = cameraBufferBuilder.dataPointer(0, 3);
camera.scaledRight = cameraBufferBuilder.dataPointer(4, 7);
camera.scaledUp = cameraBufferBuilder.dataPointer(8, 11);
camera.updateProjectionMatrix();
camera.addUpdateCallback(() => {
  camera.updateOrthonormalVectors();
  camera.updateViewMatrix();
  camera.move();
});
scene.addObject(camera, "camera");

let pointerIndex = 0;
for (let i = -5; i < 5; i++) {
  const model = new BaseObject();
  model.setPosition(2, i, 0.5);
  model.modelMatrix = objectBufferBuilder.dataPointer(pointerIndex * 16, pointerIndex * 16 + 16);
  model.addUpdateCallback(() => {
    model.updateModelMatrix();
    model.eulers[2]++;
    model.eulers[2] = model.eulers[2] % 360;
  });
  scene.addObject(model, "triangles");
  pointerIndex++;
}
for (let i = -8; i < 8; i++) {
  for (let j = -8; j < 8; j++) {
    const model = new BaseObject();
    model.setPosition(i, j, 0);
    model.modelMatrix = objectBufferBuilder.dataPointer(pointerIndex * 16, pointerIndex * 16 + 16);
    model.updateModelMatrix();
    pointerIndex++;
  }
}
statue.modelMatrix = objectBufferBuilder.dataPointer(pointerIndex * 16, pointerIndex * 16 + 16);
statue.addUpdateCallback(() => {
  statue.updateModelMatrix();
  statue.eulers[2]++;
  statue.eulers[2] = statue.eulers[2] % 360;
});
scene.addObject(statue, "statue");
pointerIndex++;

const firstPersonControl = new FirstPersonControl(camera, context.canvas, { debug: true, moveSpeed: 0.02, orientSpeed: 0.2 });

scene.addUpdateEvent(() => {
  cameraBufferBuilder.writeDataToBuffer();
  uniformBufferBuilder.writeDataToBuffer();
  objectBufferBuilder.writeDataToBuffer();
  timeBufferBuilder.writeDataToBuffer();
});

//// Bind groups

const { bindGroup: fragmentBindGroup, bindGroupLayout: fragmentBindGroupLayout } = webgpu
  .setupBindGroup("Fragment")
  .addTexture(imageView, GPUShaderStage.FRAGMENT, { viewDimension: "2d-array" })
  .addSampler(imageSampler, GPUShaderStage.FRAGMENT)
  .build();

const { bindGroup: cubemapBindGroup, bindGroupLayout: cubemapBindGroupLayout } = webgpu
  .setupBindGroup("Sky cubemap")
  .addTexture(cubemapView, GPUShaderStage.FRAGMENT, { viewDimension: "cube" })
  .addSampler(cubemapSampler, GPUShaderStage.FRAGMENT)
  .addBuffer(cameraBuffer, GPUShaderStage.VERTEX, { type: "uniform" })
  .build();

const { bindGroup: vertexBindGroup, bindGroupLayout: vertexBindGroupLayout } = webgpu
  .setupBindGroup("Vertices")
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX)
  .addBuffer(objectBuffer, GPUShaderStage.VERTEX, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .build();

const { bindGroup: hudBindGroup, bindGroupLayout: hudBindGroupLayout } = webgpu
  .setupBindGroup("HUD")
  .addTexture(hudView, GPUShaderStage.FRAGMENT)
  .addSampler(hudSampler, GPUShaderStage.FRAGMENT)
  .build();

const { bindGroup: strobeLightBindGroup, bindGroupLayout: strobeLightBindGroupLayout } = webgpu
  .setupBindGroup("Strobe light")
  .addTexture(strobeLightView, GPUShaderStage.FRAGMENT)
  .addSampler(strobeLightSampler, GPUShaderStage.FRAGMENT)
  .addBuffer(timeBuffer, GPUShaderStage.FRAGMENT, { type: "uniform" })
  .build();

const { bindGroup: weaponBindGroup, bindGroupLayout: weaponBindGroupLayout } = webgpu
  .setupBindGroup("Weapon layer")
  .addTexture(weaponView, GPUShaderStage.FRAGMENT)
  .addSampler(weaponSampler, GPUShaderStage.FRAGMENT)
  .addBuffer(timeBuffer, GPUShaderStage.FRAGMENT, { type: "uniform" })
  .build();

const { bindGroup: gunBindGroup, bindGroupLayout: gunBindGroupLayout } = webgpu
  .setupBindGroup()
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX, { type: "uniform" })
  .build();

const { bindGroup: gunSkinBindGroup, bindGroupLayout: gunSkinBindGroupLayout } = webgpu
  .setupBindGroup("Weapon layer")
  .addTexture(gunSkinView, GPUShaderStage.FRAGMENT)
  .addSampler(gunSkinSampler, GPUShaderStage.FRAGMENT)
  .build();

//// Pipelines

const format = context.getConfiguration().format;
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

const { pipeline: cubemapPipeline } = await webgpu
  .setupPipeline()
  .addBindGroupLayout(cubemapBindGroupLayout)
  .useShaderCode(assets.cubemapCode.data)
  .setVertexShader()
  .setFragmentShader({ targets: [{ format }] })
  .setRenderPrimitive({ topology: "triangle-list" })
  .setRenderDepthStencil(depthStencilState)
  .buildAsync();

const { pipeline: standardPipeline } = await webgpu
  .setupPipeline()
  .addBindGroupLayout(vertexBindGroupLayout)
  .addBindGroupLayout(fragmentBindGroupLayout)
  .useShaderCode(assets.shaderCode.data)
  .setVertexShader({ buffers: [triangleBufferLayout] })
  .setFragmentShader({ targets: [{ format }] })
  .setRenderPrimitive({ topology: "triangle-list" })
  .setRenderDepthStencil(depthStencilState)
  .buildAsync();

const { pipeline: strobeLightPipeline } = await webgpu
  .setupPipeline()
  .addBindGroupLayout(strobeLightBindGroupLayout)
  .useShaderCode(assets.strobeLightCode.data)
  .setVertexShader()
  .setFragmentShader({ targets: [{ format }] })
  .setRenderPrimitive({ topology: "triangle-list" })
  .buildAsync();

const { pipeline: hudPipeline } = await webgpu
  .setupPipeline()
  .addBindGroupLayout(hudBindGroupLayout)
  .useShaderCode(assets.hudCode.data)
  .setVertexShader()
  .setFragmentShader({ targets: [{ format, blend }] })
  .setRenderPrimitive({ topology: "triangle-list" })
  .buildAsync();

const { pipeline: gunPipeline } = await webgpu
  .setupPipeline()
  .addBindGroupLayout(gunBindGroupLayout)
  .addBindGroupLayout(gunSkinBindGroupLayout)
  .useShaderCode(assets.gunCode.data)
  .setVertexShader({ buffers: [gunBufferLayout] })
  .setFragmentShader({ targets: [{ format }] })
  .setRenderPrimitive({ topology: "triangle-list" })
  .setRenderDepthStencil(depthStencilState)
  .buildAsync();

//// Renderer

/** @type {GPURenderPassDescriptor} */
const strobeLightRenderPassDescriptor = {
  label: "Strobe light (GPURenderPassDescriptor)",
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
const weaponRenderPassDescriptor = {
  label: "Weapon layer (GPURenderPassDescriptor)",
  colorAttachments: [
    {
      view: weaponView,
      loadOp: "clear",
      storeOp: "store",
      clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
    },
  ],
  depthStencilAttachment,
};

/** @type {GPURenderPassDescriptor} */
const defaultRenderPassDescriptor = {
  label: "Default pass (GPURenderPassDescriptor)",
  colorAttachments: [
    {
      view: undefined,
      loadOp: "clear",
      storeOp: "store",
      clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
    },
  ],
};

/**
 *
 */
function render() {
  defaultRenderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

  scene.play();

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
    .draw(statue.vertexData.length / 5, 1, 0, triangleCount + tileCount)
    .end()

    // switch render pass to render the gun
    .beginRenderPass(weaponRenderPassDescriptor)
    .setPipeline(gunPipeline)
    .setVertexBuffer(0, gunBuffer)
    .setBindGroup(0, gunBindGroup)
    .setBindGroup(1, gunSkinBindGroup)
    .draw(gun.vertexData.length / 8, 1, 0, 0)
    .end()

    // switch render pass to render strobe light, weapon, and the hud
    .beginRenderPass(defaultRenderPassDescriptor)
    // strobe light layer
    .setPipeline(strobeLightPipeline)
    .setBindGroup(0, strobeLightBindGroup)
    .draw(6, 1, 0, 0)
    // weapon layer
    .setPipeline(strobeLightPipeline)
    .setBindGroup(0, weaponBindGroup)
    .draw(6, 1, 0, 0)
    // hud layer
    .setPipeline(hudPipeline)
    .setBindGroup(0, hudBindGroup)
    .draw(6, 1, 0, 0)
    .end()

    .submitCommandBuffer();

  requestAnimationFrame(render);
}

render();
