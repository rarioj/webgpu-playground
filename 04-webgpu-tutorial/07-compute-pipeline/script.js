import { WebGPU } from "../../src/system/WebGPU.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { createCanvasElement, createModalElement, createDebugElement, createInputRangeElement } from "../../src/utilities/elements.js";
import { getRandom } from "../../src/utilities/maths.js";
import { getViewProjectionMatrix } from "../../src/utilities/matrices.js";
import { createCubeGeometry } from "../../src/utilities/geometries.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";

const OBJECT_COUNT = 100000;
const OBJECT_MIN = 50000;
const OBJECT_MAX = 500000;

try {
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
  const format = context.getConfiguration().format;

  const XMIN = -canvas.width;
  const XMAX = canvas.width;
  const YMIN = -canvas.width;
  const YMAX = canvas.width;
  const ZMIN = -canvas.height;
  const ZMAX = canvas.height;

  //// Assets

  const assets = await loadAssets(
    [
      {
        name: "renderCode",
        url: `./${getQueryValue("page")}/shaders/render.wgsl`,
        type: "text",
      },
      {
        name: "computeCode",
        url: `./${getQueryValue("page")}/shaders/compute.wgsl`,
        type: "text",
      },
    ],
    true,
  );

  const { depthStencilState, depthStencilAttachment } = webgpu.setupTextureView(context).buildDepthStencil();

  //// Buffers

  const cubeData = createCubeGeometry();
  const { buffer: vertexBuffer, vertexBufferLayout } = webgpu
    .setupBuffer("Cube vertices")
    .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
    .setData(cubeData.vertices)
    .addVertexAttribute("float32x3") // x, y, z
    .addVertexAttribute("float32x2") // u, v
    .addVertexAttribute("float32x3") // nx, ny, nz
    .build();

  const { buffer: indexBuffer } = webgpu
    .setupBuffer("Cube indices")
    .setUsage(GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST)
    .setData(cubeData.indices)
    .build();

  const { builder: inputBufferBuilder, buffer: inputBuffer } = webgpu
    .setupBuffer("Input variables")
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .setData(new Float32Array([OBJECT_COUNT, XMIN, XMAX, YMIN, YMAX, ZMIN, ZMAX])) // 7 data
    .build();

  const { builder: projectionBufferBuilder, buffer: projectionBuffer } = webgpu
    .setupBuffer("Camera projection")
    .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
    .setData(new Float32Array(4 * 4)) // 4x4 matrix
    .build();

  const { builder: modelBufferBuilder, buffer: modelBuffer } = webgpu
    .setupBuffer("Cube matrices storage")
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .setData(new Float32Array(4 * 4 * OBJECT_MAX)) // 4x4 matrix * max objects
    .build();

  const { builder: velocityBufferBuilder, buffer: velocityBuffer } = webgpu
    .setupBuffer("Velocities")
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .setData(new Float32Array(4 * OBJECT_MAX)) // 4 position * max objects
    .build();

  const { builder: mvpBufferBuilder, buffer: mvpBuffer } = webgpu
    .setupBuffer("Model view projection matrices")
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .setData(new Float32Array(4 * 4 * OBJECT_MAX)) // 4x4 matrix * max objects
    .build();

  //// Scene

  const camera = new CameraObject(context, { far: 10000 });
  camera.setPosition(-5000, 0, 0);
  camera.updateProjectionMatrix();
  camera.addUpdateCallback(() => {
    camera.updateOrthonormalVectors();
    camera.updateViewMatrix();
    camera.move();
    projectionBufferBuilder.data.set(getViewProjectionMatrix(camera.viewMatrix, camera.projectionMatrix));
    projectionBufferBuilder.writeDataToBuffer();
  });

  const fps = new FirstPersonControl(camera, context.canvas, { debug: true, moveSpeed: 5, orientSpeed: 0.5 });

  for (let i = 0; i < OBJECT_MAX; i++) {
    const particle = new BaseObject();
    const scale = getRandom(0.5, 1.5);
    particle.setPosition(getRandom(XMIN, XMAX), getRandom(YMIN, YMAX), getRandom(ZMIN, ZMAX));
    particle.setScale(scale, scale, scale);
    particle.updateModelMatrix();
    modelBufferBuilder.data.set(particle.modelMatrix, i * 16);
    velocityBufferBuilder.data[i * 4 + 0] = getRandom(-5, 5);
    velocityBufferBuilder.data[i * 4 + 1] = getRandom(-5, 5);
    velocityBufferBuilder.data[i * 4 + 2] = getRandom(-5, 5);
    velocityBufferBuilder.data[i * 4 + 3] = 1.0;
  }
  modelBufferBuilder.writeDataToBuffer();
  velocityBufferBuilder.writeDataToBuffer();

  //// Pipelines

  const { pipeline: renderPipeline } = await webgpu
    .setupPipeline("Render pipeline")
    .setLayout("auto")
    .useShaderCode(assets.renderCode.data)
    .setVertexShader({ buffers: [vertexBufferLayout] })
    .setFragmentShader({ targets: [{ format }] })
    .setRenderPrimitive({
      topology: "triangle-list",
      cullMode: "back",
    })
    .setRenderDepthStencil(depthStencilState)
    .buildAsync();

  const { pipeline: computePipeline } = await webgpu
    .setupPipeline("Compute pipeline")
    .setLayout("auto")
    .useShaderCode(assets.computeCode.data)
    .setComputeShader()
    .buildAsync();

  //// Bind groups

  const { bindGroup: renderBindGroup } = webgpu
    .setupBindGroup("Render bind group")
    .setLayout(renderPipeline.getBindGroupLayout(0))
    .addBuffer(mvpBuffer)
    .build();

  const { bindGroup: computeBindGroup } = webgpu
    .setupBindGroup("Compute bind group")
    .setLayout(computePipeline.getBindGroupLayout(0))
    .addBuffer(inputBuffer)
    .addBuffer(velocityBuffer)
    .addBuffer(modelBuffer)
    .addBuffer(projectionBuffer)
    .addBuffer(mvpBuffer)
    .build();

  //// Controls

  //// Light controls

  const controls = document.createElement("footer");
  document.querySelector("article").appendChild(controls);

  const { input: particleCountInput } = createInputRangeElement({
    container: controls,
    label: "Particle count",
    min: OBJECT_MIN,
    max: OBJECT_MAX,
    step: 100,
    value: OBJECT_COUNT,
  });

  particleCountInput.addEventListener("input", (event) => {
    inputBufferBuilder.data[0] = +event.target.value;
    inputBufferBuilder.writeDataToBuffer();
  });

  //// Renderer

  /** @type {GPURenderPassDescriptor} */
  const renderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined,
        clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
    depthStencilAttachment,
  };

  const debugPerformance = createDebugElement({ label: "⏱️" }).content;
  const debugFramePerSec = createDebugElement({ label: "🏃‍♂️" }).content;
  let fpsStart = performance.now();
  let fpsCount = 0;
  let fpsCurrent = 0;

  function frame() {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    camera.update();

    const startTime = performance.now();

    webgpu
      .setupEncoder()

      // compute pass
      .beginComputePass()
      .setPipeline(computePipeline)
      .setBindGroup(0, computeBindGroup)
      .dispatchWorkgroups(Math.ceil(OBJECT_COUNT / 128))
      .end()

      // render pass
      .beginRenderPass(renderPassDescriptor)
      .setPipeline(renderPipeline)
      .setBindGroup(0, renderBindGroup)
      .setVertexBuffer(0, vertexBuffer)
      .setIndexBuffer(indexBuffer, "uint32")
      .drawIndexed(cubeData.indices.length, OBJECT_COUNT)
      .end()

      .submitCommandBuffer(() => {
        const endTime = performance.now();
        debugPerformance.innerText = `${(endTime - startTime).toFixed(1)} ms`;
      });

    fpsCount++;
    if (startTime - fpsStart >= 1000) {
      fpsCurrent = Math.round((fpsCount * 1000) / (startTime - fpsStart));
      fpsCount = 0;
      fpsStart = startTime;
      debugFramePerSec.innerText = `${fpsCurrent} fps`;
    }

    requestAnimationFrame(frame);
  }

  frame();
} catch (error) {
  createModalElement("🛑 Error", error);
  console.error(error);
}
