import { WebGPUCore } from "../../src/webgpu/WebGPUCore.js";
import { createCanvas } from "../../src/helper/elements.js";
import { getQueryValue, loadAssets } from "../../src/helper/utilities.js";
import { BaseCamera } from "../../src/components/BaseCamera.js";
import { BaseModel } from "../../src/components/BaseModel.js";

//// Initialisation

const canvas = createCanvas({
  container: document.querySelector("article"),
  width: 512,
  height: 512,
  style: {
    outline: "1px solid black",
  },
});
const webgpu = new WebGPUCore(canvas);
const { context, format } = await webgpu.init();

const camera = new BaseCamera({ canvas });
camera.setPosition(-2.5, 0, 0);

const model = new BaseModel();

//// Assets

const assets = await loadAssets([
  {
    name: "shader",
    url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
    type: "text",
  },
]);

//// Buffers

const { buffer: triangleBuffer, bufferLayout: triangleBufferLayout } = webgpu
  .setupBuffer(
    GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    new Float32Array([
      //x, y, z, r, g, b
      // red
      0.0, 0.0, 0.5, 1.0, 0.0, 0.0,
      // green
      0.0, -0.5, -0.5, 0.0, 1.0, 0.0,
      // blue
      0.0, 0.5, -0.5, 0.0, 0.0, 1.0,
    ]),
  )
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(3) // r, g, b
  .build();

const { buffer: uniformBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 64 * 3) // 4x4 matrix * 3 types (model, view, projection)
  .build();

//// Bind groups

const { bindGroup, bindGroupLayout } = webgpu.setupBindGroup().addBuffer(uniformBuffer, GPUShaderStage.VERTEX).build();

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

let step = 0;

function render() {
  camera.update();
  model.update();
  model.setEulers(0, 0, step++);

  step = step % 360;

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
