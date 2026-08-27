import { WebGPU } from "../../src/system/WebGPU.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { createCanvasElement, createModalElement, createTweakElement } from "../../src/utilities/elements.js";
import { getRandom } from "../../src/utilities/maths.js";
import { getViewProjectionMatrix } from "../../src/utilities/matrices.js";
import { createCubeGeometry, createSphereGeometry } from "../../src/utilities/geometries.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { Scene } from "../../src/modules/Scene.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";

const OBJECT_COUNT = Math.floor(parseInt(getQueryValue("count", 512)));
const CUBE_COUNT = Math.floor(OBJECT_COUNT / 2);
const SPHERE_COUNT = OBJECT_COUNT - CUBE_COUNT;
const AMBIENT_LIGHT_INTENSITY = 0.5;
const POINT_LIGHT_INTENSITY = 0;
const POINT_LIGHT_RADIUS = 10;
const DIRECTIONAL_LIGHT_INTENSITY = 0;

try {
  //// Initialisation

  const { canvas } = createCanvasElement({ noWrapper: true, style: { height: "100vh" } });
  const webgpu = await WebGPU.init();
  const context = webgpu.createCanvasContext(canvas);
  const format = context.getConfiguration().format;

  createTweakElement("Objects", `${OBJECT_COUNT}`, { readonly: true });

  //// Assets

  const assets = await loadAssets([
    {
      name: "shaderCode",
      url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
      type: "text",
    },
  ]);

  const depthStencilBuilder = webgpu.setupDepthStencil().setTextureSize(canvas.width, canvas.height);

  //// Buffers

  const cubeGeometry = createCubeGeometry();
  const { buffer: cubeVertexBuffer, vertexBufferLayout } = webgpu
    .setupBuffer("Cube vertices")
    .loadBufferData(cubeGeometry.vertices)
    .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
    .addVertexAttribute("float32x3") // x, y, z
    .addVertexAttribute("float32x2") // u, v
    .addVertexAttribute("float32x3") // nx, ny, nz
    .build();
  const { buffer: cubeIndexBuffer } = webgpu
    .setupBuffer("Cube indices")
    .loadBufferData(cubeGeometry.indices)
    .setUsage(GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST)
    .build();

  const sphereGeometry = createSphereGeometry({ latitudes: 32, longitudes: 32 });
  const { buffer: sphereVertexBuffer } = webgpu
    .setupBuffer("Sphere vertices")
    .loadBufferData(sphereGeometry.vertices)
    .setUsage(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
    .addVertexAttribute("float32x3") // x, y, z
    .addVertexAttribute("float32x2") // u, v
    .addVertexAttribute("float32x3") // nx, ny, nz
    .build();
  const { buffer: sphereIndexBuffer } = webgpu
    .setupBuffer("Sphere indices")
    .loadBufferData(sphereGeometry.indices)
    .setUsage(GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST)
    .build();

  const modelViewBufferBuilder = webgpu
    .setupBuffer("Model view matrices")
    .loadBufferData(new Float32Array(4 * 4 * OBJECT_COUNT)) // 4x4 matrix * number of objects
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .build();
  const projectionBufferBuilder = webgpu
    .setupBuffer("Projection matrix")
    .loadBufferData(new Float32Array(4 * 4)) // 4x4 matrix
    .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
    .build();
  const colorBufferBuilder = webgpu
    .setupBuffer("Object color")
    .loadBufferData(new Float32Array(4 * OBJECT_COUNT)) // 4 (rgba) * number of objects
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .build();

  const ambientLightBufferBuilder = webgpu
    .setupBuffer("Ambient light")
    .loadBufferData(new Float32Array([AMBIENT_LIGHT_INTENSITY]))
    .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
    .build();

  const pointLightBufferBuilder = webgpu
    .setupBuffer("Point light")
    .loadBufferData(new Float32Array(8)) // vec4 + configuration
    .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
    .build();
  // pointLightBufferBuilder.data[2] = -50; // z position
  pointLightBufferBuilder.data[4] = POINT_LIGHT_INTENSITY;
  pointLightBufferBuilder.data[5] = POINT_LIGHT_RADIUS;

  const directionalLightBufferBuilder = webgpu
    .setupBuffer("Directional light")
    .loadBufferData(new Float32Array(8)) // vec4 + configuration
    .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
    .build();
  directionalLightBufferBuilder.data[4] = DIRECTIONAL_LIGHT_INTENSITY;

  //// Scene

  const scene = new Scene();
  const camera = new CameraObject({ width: canvas.width, height: canvas.height, far: 250 });
  camera.setPosition(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.addUpdateCallback(() => {
    camera.updateOrthonormalVectors();
    camera.updateViewMatrix();
    camera.move();
    projectionBufferBuilder.setData(getViewProjectionMatrix(camera.viewMatrix, camera.projectionMatrix));
  });
  scene.addObject(camera);

  const fps = new FirstPersonControl(camera, context.canvas, { debug: true, moveSpeed: 0.3, orientSpeed: 0.3 });

  for (let i = 0; i < OBJECT_COUNT; i++) {
    const scale = getRandom(0.25, 1.25);
    const stuff = new BaseObject();
    stuff.setPosition(getRandom(-20, 20), getRandom(-20, 20), getRandom(-20, 20));
    stuff.setEulers(getRandom(-90, 90), getRandom(-90, 90), getRandom(-90, 90));
    stuff.setScale(scale, scale, scale);
    stuff.updateModelMatrix();
    modelViewBufferBuilder.setData(stuff.modelMatrix, i * 16);
    colorBufferBuilder.setData([Math.random(), Math.random(), Math.random(), 1.0], i * 4);
    scene.addObject(stuff);
  }
  modelViewBufferBuilder.writeDataToBuffer();
  colorBufferBuilder.writeDataToBuffer();

  scene.addUpdateEvent(() => {
    const now = performance.now();
    directionalLightBufferBuilder.data[0] = Math.sin(now / 1500);
    directionalLightBufferBuilder.data[2] = Math.cos(now / 1500);

    // modelViewBufferBuilder.writeDataToBuffer();
    projectionBufferBuilder.writeDataToBuffer();
    // colorBufferBuilder.writeDataToBuffer();
    ambientLightBufferBuilder.writeDataToBuffer();
    pointLightBufferBuilder.writeDataToBuffer();
    directionalLightBufferBuilder.writeDataToBuffer();
  });

  depthStencilBuilder.build();
  webgpu.observeCanvasResize(canvas, (width, height) => {
    camera.resize(width, height);
    depthStencilBuilder.setTextureSize(width, height).build();
  });

  //// Light controls

  createTweakElement("Ambient", AMBIENT_LIGHT_INTENSITY, { min: 0, max: 1, step: 0.01 }, (event) => {
    ambientLightBufferBuilder.data[0] = event.value;
  });
  createTweakElement("Point", POINT_LIGHT_INTENSITY, { min: 0, max: 1, step: 0.01 }, (event) => {
    pointLightBufferBuilder.data[4] = event.value;
  });
  createTweakElement("Point R", POINT_LIGHT_RADIUS, { min: 0, max: 100, step: 1 }, (event) => {
    pointLightBufferBuilder.data[5] = event.value;
  });
  createTweakElement("Direct", DIRECTIONAL_LIGHT_INTENSITY, { min: 0, max: 1, step: 0.01 }, (event) => {
    directionalLightBufferBuilder.data[4] = event.value;
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
    .setRenderDepthStencil(depthStencilBuilder.state)
    .buildAsync();

  //// Bind groups

  const { bindGroup } = webgpu
    .setupBindGroup("Uniform bind group")
    .setLayout(pipeline.getBindGroupLayout(0))
    .addBuffer(modelViewBufferBuilder.buffer)
    .addBuffer(projectionBufferBuilder.buffer)
    .addBuffer(colorBufferBuilder.buffer)
    .build();

  const { bindGroup: lightBindGroup } = webgpu
    .setupBindGroup("Lighting bind group")
    .setLayout(pipeline.getBindGroupLayout(1))
    .addBuffer(ambientLightBufferBuilder.buffer)
    .addBuffer(pointLightBufferBuilder.buffer)
    .addBuffer(directionalLightBufferBuilder.buffer)
    .build();

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
    depthStencilAttachment: depthStencilBuilder.attachment,
  };

  function frame() {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    scene.play();

    webgpu
      .setupEncoder()
      .beginRenderPass(renderPassDescriptor)
      .setPipeline(pipeline)
      .setBindGroup(0, bindGroup)
      .setBindGroup(1, lightBindGroup)

      // cube
      .setVertexBuffer(0, cubeVertexBuffer)
      .setIndexBuffer(cubeIndexBuffer, "uint32")
      .drawIndexed(cubeGeometry.indices.length, CUBE_COUNT, 0, 0, 0)
      // sphere
      .setVertexBuffer(0, sphereVertexBuffer)
      .setIndexBuffer(sphereIndexBuffer, "uint32")
      .drawIndexed(sphereGeometry.indices.length, SPHERE_COUNT, 0, 0, CUBE_COUNT)

      .end()
      .submitCommandBuffer();

    requestAnimationFrame(frame);
  }

  frame();
} catch (error) {
  createModalElement("🚫 Error", error, { container: document.querySelector("main"), closeButton: false });
  console.error(error);
}
