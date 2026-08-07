import { WebGPU } from "../../src/system/WebGPU.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { createCanvasElement, createModalElement, createDebugElement } from "../../src/utilities/elements.js";
import { getRandom } from "../../src/utilities/maths.js";
import { getModelViewProjectionMatrix } from "../../src/utilities/matrices.js";
import { createCubeGeometry, createSphereGeometry } from "../../src/utilities/geometries.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { Scene } from "../../src/modules/Scene.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";

const OBJECT_COUNT = Math.floor(parseInt(getQueryValue("count", 1024)));
const GEOMETRY = getQueryValue("geometry", "cube");

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

  const debugCubeCount = createDebugElement({ label: GEOMETRY === "sphere" ? "⚽" : "📦" }).content;
  debugCubeCount.innerText = `${OBJECT_COUNT} ${GEOMETRY}s`;

  //// Assets

  const assets = await loadAssets(
    [
      {
        name: "shaderCode",
        url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
        type: "text",
      },
    ],
    true,
  );

  const { depthStencilState, depthStencilAttachment } = webgpu.setupTextureView(context).buildDepthStencil();

  //// Buffers and scene

  const geometryVertexData =
    GEOMETRY === "sphere"
      ? createSphereGeometry({ radius: 1.5, latitudes: 8, longitudes: 8, useNormal: false, indexed: false })
      : createCubeGeometry({ size: 2.0, useNormal: false, indexed: false });
  const { buffer: vertexBuffer, vertexBufferLayout } = webgpu
    .setupBuffer("Cube vertices")
    .setData(geometryVertexData.vertices)
    .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
    .addVertexAttribute("float32x3") // x, y, z
    .addVertexAttribute("float32x2") // u, v
    .build();

  const { builder: mvpBufferBuilder, buffer: mvpBuffer } = webgpu
    .setupBuffer("MVP matrices")
    .setData(new Float32Array(4 * 4 * 4 * OBJECT_COUNT)) // 4x4 matrix of 4-bytes float * number of cubes
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .build();

  const scene = new Scene();
  const camera = new CameraObject(context, { far: 1000 });
  camera.setPosition(-25, 0, 0);
  camera.updateProjectionMatrix();
  camera.addUpdateCallback(() => {
    camera.updateOrthonormalVectors();
    camera.updateViewMatrix();
    camera.move();
  });
  scene.addObject(camera);

  const fps = new FirstPersonControl(camera, context.canvas, { debug: true, moveSpeed: 0.3, orientSpeed: 0.3 });

  for (let i = 0; i < OBJECT_COUNT; i++) {
    const scale = getRandom(0.25, 1.25);
    const cube = new BaseObject();
    cube.setPosition(getRandom(-50, 50), getRandom(-50, 50), getRandom(-50, 50));
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

  scene.addUpdateEvent(() => {
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
      .draw(geometryVertexData.vertices.length / 5, OBJECT_COUNT)
      .end()
      .submitCommandBuffer();

    requestAnimationFrame(frame);
  }

  frame();
} catch (error) {
  createModalElement("🛑 Error", error);
  console.error(error);
}
