import { WebGPUCore } from "./src/webgpu/WebGPUCore.js";
import { createCanvas } from "./src/helper/elements.js";
import { loadAssets } from "./src/helper/utilities.js";
import { FirstPersonCamera } from "./src/components/FirstPersonCamera.js";
import { BaseModel } from "./src/components/BaseModel.js";

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

const camera = new FirstPersonCamera({ canvas, debug: true });
camera.setPosition(-2.5, 0, 0);

const model = new BaseModel();
model.setUpdateCallback((updateObject) => {
  const eulers = updateObject.eulers;
  eulers[2]++;
  eulers[2] = eulers[2] % 360;
  updateObject.setEulers(eulers[0], eulers[1], eulers[2]);
});

//// Assets

const assets = await loadAssets([
  {
    name: "shader",
    url: "./shaders/shader.wgsl",
    type: "text",
  },
  {
    name: "image",
    url: `./assets/images/95-1024.webp`,
    type: "blob",
  },
]);

const { view, sampler } = await webgpu.createTextureViewSampler([assets.image]);

//// Buffers

const { buffer: triangleBuffer, bufferLayout: triangleBufferLayout } = webgpu
  .setupBuffer(
    GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    new Float32Array([
      //x, y, z, u, v
      // top corner
      0.0, 0.0, 0.5, 0.5, 0.0,
      // bottom left corner
      0.0, -0.5, -0.5, 0.0, 1.0,
      // bottom right corner
      0.0, 0.5, -0.5, 1.0, 1.0,
    ]),
  )
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();

const { buffer: uniformBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 64 * 3) // 4x4 matrix * 3 types (model, view, projection)
  .build();

//// Bind groups

const { bindGroup, bindGroupLayout } = webgpu
  .setupBindGroup()
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX)
  .addTexture(view, GPUShaderStage.FRAGMENT)
  .addSampler(sampler, GPUShaderStage.FRAGMENT)
  .build();

//// Pipelines

const { pipeline } = webgpu
  .setupPipeline()
  .addBindGroupLayout(bindGroupLayout)
  .setShaderCode(assets.shader)
  .setVertexShader("vertexMain", { buffers: [triangleBufferLayout] })
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .build();

//// Renderer

function render() {
  camera.update();
  model.update();

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
  };

  webgpu.queueWriteBuffer(uniformBuffer, 0, model.matrix);
  webgpu.queueWriteBuffer(uniformBuffer, 64, camera.view);
  webgpu.queueWriteBuffer(uniformBuffer, 128, camera.projection);

  webgpu
    .setupEncoder()
    .beginRenderPass(renderPassDescriptor)
    .setPipeline(pipeline)
    .setVertexBuffer(0, triangleBuffer)
    .setBindGroup(0, bindGroup)
    .draw(3, 1)
    .end()
    .queueSubmit();

  requestAnimationFrame(render);
}

render();
