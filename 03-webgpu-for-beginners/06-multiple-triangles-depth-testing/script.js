import { WebGPUCore } from "./src/webgpu/WebGPUCore.js";
import { createCanvas } from "./src/helper/elements.js";
import { loadAssets } from "./src/helper/utilities.js";
import { FirstPersonCamera } from "./src/components/FirstPersonCamera.js";
import { BaseModel } from "./src/components/BaseModel.js";
import { BaseScene } from "./src/components/BaseScene.js";
import { assetArray, triangleVertices } from "./config.js";

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

//// Scene

const camera = new FirstPersonCamera({ canvas, debug: true });
camera.setPosition(-7, -0.5, 0.5);

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
  scene.addObject(model);
}

//// Assets

const assets = await loadAssets(assetArray);
const { view, sampler } = await webgpu.createTextureViewSampler(assets.image);

//// Buffers

const { buffer: triangleBuffer, bufferLayout: triangleBufferLayout } = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, new Float32Array(triangleVertices))
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();

const { buffer: uniformBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 64 * 2) // 4x4 matrix * 2 types (view, projection)
  .build();

const { buffer: objectBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 64 * 1024) // 4x4 matrix * 2^10
  .build();

//// Bind groups

const { bindGroup, bindGroupLayout } = webgpu
  .setupBindGroup()
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX)
  .addTexture(view, GPUShaderStage.FRAGMENT, {
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

const { state: depthStencilState, attachment: depthStencilAttachment } = webgpu.configureDepthStencil();

const { pipeline } = webgpu
  .setupPipeline()
  .addBindGroupLayout(bindGroupLayout)
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

  webgpu
    .setupEncoder()
    .beginRenderPass(renderPassDescriptor)
    .setPipeline(pipeline)
    .setVertexBuffer(0, triangleBuffer)
    .setBindGroup(0, bindGroup)
    .draw(3, scene.objects.length)
    .end()
    .queueSubmit();

  requestAnimationFrame(render);
}

render();
