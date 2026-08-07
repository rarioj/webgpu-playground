import { WebGPU } from "../../src/system/WebGPU.js";
import { createCanvasElement } from "../../src/utilities/elements.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { Scene } from "../../src/modules/Scene.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";
import { assetArray, triangleVertices } from "./config.js";

//// Initialisation

const { canvas } = createCanvasElement({
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

const { builder: uniformBufferBuilder, buffer: uniformBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(16 * 2)) // 4x4 matrix * 2 types (view, projection)
  .build();

const objectCount = 10;
const { builder: objectBufferBuilder, buffer: objectBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  .setData(new Float32Array(16 * objectCount)) // 4x4 matrix * 10 triangles
  .build();

//// Scene and event

const scene = new Scene();

const camera = new CameraObject(context);
camera.setPosition(-7, -0.5, 0);
camera.viewMatrix = uniformBufferBuilder.dataPointer(0, 16);
camera.projectionMatrix = uniformBufferBuilder.dataPointer(16, 32);
camera.updateProjectionMatrix();
camera.addUpdateCallback(() => {
  camera.updateOrthonormalVectors();
  camera.updateViewMatrix();
  camera.move();
});
scene.addObject(camera);

for (let i = -5; i < 5; i++) {
  const model = new BaseObject();
  model.setPosition(2, i, 0.5);
  model.modelMatrix = objectBufferBuilder.dataPointer((i + 5) * 16, (i + 5) * 16 + 16);
  model.addUpdateCallback(() => {
    model.updateModelMatrix();
    model.eulers[2]++;
    model.eulers[2] = model.eulers[2] % 360;
  });
  scene.addObject(model);
}

const firstPersonControl = new FirstPersonControl(camera, context.canvas, { debug: true, moveSpeed: 0.02, orientSpeed: 0.2 });

scene.addUpdateEvent(() => {
  uniformBufferBuilder.writeDataToBuffer();
  objectBufferBuilder.writeDataToBuffer();
});

//// Bind groups

const { bindGroup, bindGroupLayout } = webgpu
  .setupBindGroup()
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX)
  .addTexture(textureView, GPUShaderStage.FRAGMENT, {
    sampleType: "float",
    viewDimension: "2d-array",
  })
  .addSampler(sampler, GPUShaderStage.FRAGMENT)
  .addBuffer(objectBuffer, GPUShaderStage.VERTEX, {
    type: "read-only-storage",
    hasDynamicOffset: false,
  })
  .build();

//// Pipelines

const { pipeline } = webgpu
  .setupPipeline()
  .addBindGroupLayout(bindGroupLayout)
  .useShaderCode(assets.shader.data)
  .setVertexShader({ buffers: [triangleBufferLayout] })
  .setFragmentShader({ targets: [{ format: context.getConfiguration().format }] })
  .setRenderPrimitive({ topology: "triangle-list" })
  .setRenderDepthStencil(depthStencilState)
  .build();

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
    .setVertexBuffer(0, triangleBuffer)
    .setBindGroup(0, bindGroup)
    .draw(3, objectCount)
    .end()
    .submitCommandBuffer();

  requestAnimationFrame(render);
}

render();
