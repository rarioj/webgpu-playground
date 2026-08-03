import { WebGPU } from "../../src/system/WebGPU.js";
import { createCanvasElement } from "../../src/utilities/elements.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { Scene } from "../../src/modules/Scene.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { OBJModelObject } from "../../src/objects/OBJModelObject.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";
import { assetArray, triangleVertices, tileVertices } from "./config.js";

//// Initialisation

const canvas = createCanvasElement({
  container: document.querySelector("article"),
  width: 800,
  height: 600,
  style: {
    outline: "1px solid black",
  },
});
const webgpu = await WebGPU.init();
const context = webgpu.createCanvasContext(canvas);

//// Assets

const assets = await loadAssets(assetArray, true);
const { textureView, sampler } = webgpu
  .setupTextureView(context)
  .setTextureUsage(GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT)
  .loadBitmaps(assets.image)
  .build();
const { depthStencilState, depthStencilAttachment } = webgpu.setupTextureView(context).buildDepthStencil();

//// Buffers

const { buffer: triangleBuffer, vertexBufferLayout: triangleBufferLayout } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(triangleVertices))
  .addVertexAttribute("float32x3") // x, y, z
  .addVertexAttribute("float32x2") // u, v
  .build();

const { buffer: tileBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(tileVertices))
  .addVertexAttribute("float32x3") // x, y, z
  .addVertexAttribute("float32x2") // u, v
  .build();

const statue = new OBJModelObject(assets.statue.data);
statue.setScale(0.25, 0.25, 0.25);
const { buffer: statueBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(statue.vertexData))
  .addVertexAttribute("float32x3") // x, y, z
  .addVertexAttribute("float32x2") // u, v
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

//// Scene and event

const scene = new Scene();

const camera = new CameraObject(context);
camera.setPosition(-7, -0.5, 0.5);
camera.viewMatrix = uniformBufferBuilder.dataPointer(0, 16);
camera.projectionMatrix = uniformBufferBuilder.dataPointer(16, 32);
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

scene.addEvent(() => {
  uniformBufferBuilder.writeDataToBuffer();
  objectBufferBuilder.writeDataToBuffer();
});

//// Bind groups

const { bindGroup: fragmentBindGroup, bindGroupLayout: fragmentBindGroupLayout } = webgpu
  .setupBindGroup()
  .addTexture(textureView, GPUShaderStage.FRAGMENT, { viewDimension: "2d-array" })
  .addSampler(sampler, GPUShaderStage.FRAGMENT)
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

const { pipeline } = await webgpu
  .setupPipeline()
  .addBindGroupLayout(vertexBindGroupLayout)
  .addBindGroupLayout(fragmentBindGroupLayout)
  .useShaderCode(assets.shader.data)
  .setVertexShader({ buffers: [triangleBufferLayout] })
  .setFragmentShader({ targets: [{ format: context.getConfiguration().format }] })
  .setRenderPrimitive({ topology: "triangle-list" })
  .setRenderDepthStencil(depthStencilState)
  .buildAsync();

//// Renderer

/** @type {GPURenderPassDescriptor} */
const renderPassDescriptor = {
  colorAttachments: [
    {
      view: undefined,
      loadOp: "clear",
      storeOp: "store",
      clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
    },
  ],
  depthStencilAttachment,
};

function render() {
  renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

  scene.play();

  webgpu
    .setupEncoder()
    .beginRenderPass(renderPassDescriptor)
    .setPipeline(pipeline)
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
    .draw(statue.vertexData.length / 5, statueCount, 0, triangleCount + tileCount)

    .end()
    .submitCommandBuffer();

  requestAnimationFrame(render);
}

render();
