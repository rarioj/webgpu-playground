import { WebGPU } from "../../src/system/WebGPU.js";
import { createCanvasElement, createModalElement } from "../../src/utilities/elements.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { getModelViewProjectionMatrix } from "../../src/utilities/matrices.js";
import { createCubeGeometry, createSphereGeometry } from "../../src/utilities/geometries.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { Scene } from "../../src/modules/Scene.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";

const GEOMETRY = getQueryValue("geometry", "cube");
const SMOOTHNESS = Math.floor(parseInt(getQueryValue("smoothness", "8")));

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
      ? createSphereGeometry({ radius: 1.5, latitudes: SMOOTHNESS, longitudes: SMOOTHNESS, useNormal: false, indexed: false })
      : createCubeGeometry({ size: 2.0, useNormal: false, indexed: false });
  const { buffer: vertexBuffer, vertexBufferLayout } = webgpu
    .setupBuffer("Geometry vertices")
    .setData(geometryVertexData.vertices)
    .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
    .addVertexAttribute("float32x3") // x, y, z
    .addVertexAttribute("float32x2") // u, v
    .build();

  const { builder: mvpBufferBuilder, buffer: mvpBuffer } = webgpu
    .setupBuffer("MVP matrices")
    .setData(new Float32Array(4 * 4 * 4)) // 4x4 matrix of 4-bytes float
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .build();

  const scene = new Scene();
  const camera = new CameraObject(context);
  camera.setPosition(-5, 0, 0);
  camera.updateOrthonormalVectors();
  camera.updateProjectionMatrix();
  camera.updateViewMatrix();
  scene.addObject(camera);

  const cube = new BaseObject();
  cube.addUpdateCallback(() => {
    cube.updateModelMatrix();
    cube.eulers[1]++;
    cube.eulers[1] = cube.eulers[1] % 360;
    cube.eulers[2]++;
    cube.eulers[2] = cube.eulers[2] % 360;
    const mvpMatrix = getModelViewProjectionMatrix(cube.modelMatrix, camera.viewMatrix, camera.projectionMatrix);
    mvpBufferBuilder.data.set(mvpMatrix);
  });
  scene.addObject(cube);

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
      .draw(geometryVertexData.vertices.length / 5, 1)
      .end()
      .submitCommandBuffer();

    requestAnimationFrame(frame);
  }

  frame();
} catch (error) {
  createModalElement("🛑 Error", error);
  console.error(error);
}
