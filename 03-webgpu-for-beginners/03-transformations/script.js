import { WebGPU } from "../../src/system/WebGPU.js";
import { createCanvasElement } from "../../src/utilities/elements.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";

//// Initialisation

const { canvas } = createCanvasElement({
  container: document.querySelector("article"),
  width: 512,
  height: 512,
  style: {
    outline: "1px solid black",
  },
});
const webgpu = await WebGPU.init();
const context = webgpu.createCanvasContext(canvas);

//// Assets

const assets = await loadAssets(
  [
    {
      name: "shader",
      url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
      type: "text",
    },
  ],
  true,
);

//// Buffers

const { buffer: triangleBuffer, vertexBufferLayout: triangleBufferLayout } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
  .loadBufferData(
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
  .addVertexAttribute("float32x3") // x, y, z
  .addVertexAttribute("float32x3") // r, g, b
  .build();

const { builder: uniformBuilder, buffer: uniformBuffer } = webgpu
  .setupBuffer()
  .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
  .loadBufferData(new Float32Array(16 * 3)) // 4x4 matrix * 3 types (model, view, projection)
  .build();

//// Scene objects

const model = new BaseObject();
model.modelMatrix = uniformBuilder.dataPointer(0, 16);
model.addUpdateCallback(() => {
  model.updateModelMatrix();
  model.eulers[2]++;
  model.eulers[2] = model.eulers[2] % 360;
  uniformBuilder.writeDataToBuffer();
});

const camera = new CameraObject({ width: canvas.width, height: canvas.height });
camera.setPosition(-2.5, 0, 0);
camera.viewMatrix = uniformBuilder.dataPointer(16, 32);
camera.projectionMatrix = uniformBuilder.dataPointer(32, 48);
camera.updateOrthonormalVectors();
camera.updateViewMatrix();
camera.updateProjectionMatrix();

//// Bind groups

const { bindGroup, bindGroupLayout } = webgpu.setupBindGroup().addBuffer(uniformBuffer, GPUShaderStage.VERTEX).build();

//// Pipelines

const { pipeline } = await webgpu
  .setupPipeline()
  .addBindGroupLayout(bindGroupLayout)
  .useShaderCode(assets.shader.data)
  .setVertexShader({ buffers: [triangleBufferLayout] })
  .setFragmentShader({ targets: [{ format: context.getConfiguration().format }] })
  .setRenderPrimitive({ topology: "triangle-list" })
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
};

function render() {
  renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

  model.update();

  webgpu
    .setupEncoder()
    .beginRenderPass(renderPassDescriptor)
    .setPipeline(pipeline)
    .setVertexBuffer(0, triangleBuffer)
    .setBindGroup(0, bindGroup)
    .draw(3, 1)
    .end()
    .submitCommandBuffer();

  requestAnimationFrame(render);
}

render();
