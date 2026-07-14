import { WebGPUCore } from "./src/webgpu/WebGPUCore.js";
import { createCanvas } from "./src/helper/elements.js";
import { loadAssets } from "./src/helper/utilities.js";
import { FirstPersonCamera } from "./src/components/FirstPersonCamera.js";
import { BaseModel } from "./src/components/BaseModel.js";
import { SceneBuilder } from "./src/components/SceneBuilder.js";
import { assetArray, triangleVertices, tileVertices } from "./config.js";
import { parseOBJCode } from "./src/helper/parser.js";

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

const scene = new SceneBuilder(camera);
for (let i = -5; i < 5; i++) {
  const model = new BaseModel();
  model.setPosition(2, i, 0.5);
  model.setUpdateCallback((updateObject) => {
    const eulers = updateObject.eulers;
    eulers[2]++;
    eulers[2] = eulers[2] % 360;
    updateObject.setEulers(eulers[0], eulers[1], eulers[2]);
  });
  scene.addModel(model, "triangles");
}
for (let i = -8; i < 8; i++) {
  for (let j = -8; j < 8; j++) {
    const model = new BaseModel();
    model.setPosition(i, j, 0);
    scene.addModel(model, "tiles");
  }
}
const statue = new BaseModel({ scale: [0.4, 0.4, 0.4] });
statue.setPosition(0, 0, 0);
statue.setUpdateCallback((updateObject) => {
  const eulers = updateObject.eulers;
  eulers[2]++;
  eulers[2] = eulers[2] % 360;
  updateObject.setEulers(eulers[0], eulers[1], eulers[2]);
});
scene.addModel(statue, "statue");
scene.build();

//// Assets

const assets = await loadAssets(assetArray);
const { view, sampler, bindGroupBuilder: fragmentBindGroupBuilder } = await webgpu.createTextureViewSampler(assets.image);

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

const statueData = parseOBJCode(assets.statue, { transform: statue.matrix });
const { buffer: statueBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, new Float32Array(statueData))
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

const { bindGroup: fragmentBindGroup, bindGroupLayout: fragmentBindGroupLayout } = fragmentBindGroupBuilder.build();

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

const { pipeline } = webgpu
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

  webgpu.queueWriteBuffer(objectBuffer, 0, scene.data, 0, scene.data.length);
  webgpu.queueWriteBuffer(uniformBuffer, 0, scene.camera.view);
  webgpu.queueWriteBuffer(uniformBuffer, 64, scene.camera.projection);

  webgpu
    .setupEncoder()
    .beginRenderPass(renderPassDescriptor)
    .setPipeline(pipeline)
    .setBindGroup(0, vertexBindGroup)

    // triangles
    .setVertexBuffer(0, triangleBuffer)
    .setBindGroup(1, fragmentBindGroup)
    .draw(3, scene.typeCount["triangles"], 0, 0)

    // tiles
    .setVertexBuffer(0, tileBuffer)
    .setBindGroup(1, fragmentBindGroup)
    .draw(6, scene.typeCount["tiles"], 0, scene.typeCount["triangles"])

    // statue
    .setVertexBuffer(0, statueBuffer)
    .setBindGroup(1, fragmentBindGroup)
    .draw(statueData.length / 5, 1, 0, scene.typeCount["triangles"] + scene.typeCount["tiles"])

    .end()
    .queueSubmit();

  requestAnimationFrame(render);
}

render();
