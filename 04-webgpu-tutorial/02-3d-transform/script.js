import { WebGPU } from "../../src/system/WebGPU.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { createCanvasElement, createModalElement, createDebugElement } from "../../src/utilities/elements.js";
import { getRandom, getModelViewProjectionMatrix } from "../../src/utilities/maths.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { Scene } from "../../src/modules/Scene.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { config } from "./config.js";

const CUBE_COUNT = Math.floor(parseInt(getQueryValue("cubes", 256)));

try {
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
  const format = context.getConfiguration().format;

  const debugCubeCount = createDebugElement({ label: "🧊" }).content;
  debugCubeCount.innerText = `${CUBE_COUNT} cubes`;

  //// Assets

  const assets = await loadAssets(config.resources, true);

  const { depthStencilState, depthStencilAttachment } = webgpu.setupTextureView(context).buildDepthStencil();

  //// Buffers and scene

  const { buffer: vertexBuffer, vertexBufferLayout } = webgpu
    .setupBuffer("Cube vertices")
    .setData(new Float32Array(config.cubeVertexArray))
    .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
    .addVertexAttribute("float32x3") // x, y, z
    .addVertexAttribute("float32x2") // u, v
    .build();

  const { builder: mvpBufferBuilder, buffer: mvpBuffer } = webgpu
    .setupBuffer("MVP matrices")
    .setData(new Float32Array(4 * 4 * 4 * CUBE_COUNT)) // 4x4 matrix of 4-bytes float * number of cubes
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .build();

  const scene = new Scene();
  const camera = new CameraObject(context);
  camera.setPosition(-25, 0, 0);
  camera.updateOrthonormalVectors();
  camera.updateProjectionMatrix();
  camera.updateViewMatrix();
  scene.addObject(camera);

  for (let i = 0; i < CUBE_COUNT; i++) {
    const scale = getRandom(0.25, 0.75);
    const cube = new BaseObject();
    cube.setPosition(getRandom(-20, 20), getRandom(-20, 20), getRandom(-20, 20));
    cube.setEulers(getRandom(-90, 90), getRandom(-90, 90), getRandom(-90, 90));
    cube.setScale(scale, scale, scale);
    cube.addUpdateCallback(() => {
      cube.updateModelMatrix();
      cube.eulers[1]++;
      cube.eulers[1] = cube.eulers[1] % 360;
      cube.eulers[2]++;
      cube.eulers[2] = cube.eulers[2] % 360;
      const mvpMatrix = getModelViewProjectionMatrix(cube.modelMatrix, camera.viewMatrix, camera.projectionMatrix);
      mvpBufferBuilder.data.set(mvpMatrix, i * 16);
    });
    scene.addObject(cube);
  }

  scene.addEvent(() => {
    mvpBufferBuilder.writeDataToBuffer();
  });

  //// Pipelines

  const { pipeline } = await webgpu
    .setupPipeline("Instanced cubes")
    .setLayout("auto")
    .useShaderCode(assets.shaderCode.data)
    .setVertexShader({ buffers: [vertexBufferLayout] })
    .setFragmentShader({ targets: [{ format }] })
    .setRenderPrimitive({
      topology: "triangle-list",
      cullMode: "back",
    })
    .setRenderDepthStencil(depthStencilState)
    .buildAsync();

  //// Bind groups

  const { bindGroup } = webgpu.setupBindGroup("Uniform bind group").setLayout(pipeline.getBindGroupLayout(0)).addBuffer(mvpBuffer).build();

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

  function frame() {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    scene.play();

    webgpu
      .setupEncoder()
      .beginRenderPass(renderPassDescriptor)
      .setPipeline(pipeline)
      .setVertexBuffer(0, vertexBuffer)
      .setBindGroup(0, bindGroup)
      .draw(config.cubeVertexCount, CUBE_COUNT)
      .end()
      .submitCommandBuffer();

    requestAnimationFrame(frame);
  }

  frame();
} catch (error) {
  createModalElement("🛑 Error", error);
  console.error(error);
}
