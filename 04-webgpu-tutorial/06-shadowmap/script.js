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

const OBJECT_COUNT = Math.floor(parseInt(getQueryValue("count", 128)));

try {
  //// Initialisation

  const { canvas } = createCanvasElement({ noWrapper: true, style: { height: "100vh" } });
  const webgpu = await WebGPU.init();
  const context = webgpu.createCanvasContext(canvas);
  const format = context.getConfiguration().format;

  createTweakElement("Object", `${OBJECT_COUNT - 2} balls`, { readonly: true });

  //// Assets

  const assets = await loadAssets([
    {
      name: "shaderCode",
      url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
      type: "text",
    },
    {
      name: "shadowCode",
      url: `./${getQueryValue("page")}/shaders/shadow.wgsl`,
      type: "text",
    },
  ]);

  const { textureView: shadowDepthTextureView, sampler: shadowDepthSampler } = webgpu
    .setupTexture("Shadow depth texture")
    .setTextureSize(4096, 4096)
    .setTextureUsage(GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING)
    .setTextureFormat("depth32float")
    .build({ createSampler: true, overrideSamplerDescriptor: { compare: "less" } });

  const renderDepthTextureBuilder = webgpu
    .setupTexture("Shadow depth texture")
    .setTextureSize(canvas.width, canvas.height)
    .setTextureUsage(GPUTextureUsage.RENDER_ATTACHMENT)
    .setTextureFormat("depth32float");

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

  const sphereGeometry = createSphereGeometry({ latitudes: 16, longitudes: 16 });
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
  const cameraProjectionBufferBuilder = webgpu
    .setupBuffer("Camera projection matrix")
    .loadBufferData(new Float32Array(4 * 4)) // 4x4 matrix
    .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
    .build();
  const lightProjectionBufferBuilder = webgpu
    .setupBuffer("Light projection matrix")
    .loadBufferData(new Float32Array(4 * 4)) // 4x4 matrix
    .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
    .build();
  const colorBufferBuilder = webgpu
    .setupBuffer("Object color")
    .loadBufferData(new Float32Array(4 * OBJECT_COUNT)) // 4 (rgba) * number of objects
    .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
    .build();
  const lightBufferBuilder = webgpu
    .setupBuffer("Generic light")
    .loadBufferData(new Float32Array(4)) // vec4
    .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
    .build();

  //// Scene

  const scene = new Scene();
  const camera = new CameraObject({ width: canvas.width, height: canvas.height, far: 1000 });
  camera.setPosition(-90, 0, 30);
  camera.setEulers(0, -30, 0);
  camera.updateProjectionMatrix();
  camera.addUpdateCallback(() => {
    camera.updateOrthonormalVectors();
    camera.updateViewMatrix();
    camera.move();
    cameraProjectionBufferBuilder.setData(getViewProjectionMatrix(camera.viewMatrix, camera.projectionMatrix));
  });
  scene.addObject(camera);

  const fps = new FirstPersonControl(camera, context.canvas, { debug: true, moveSpeed: 0.3, orientSpeed: 0.3 });

  const factor = 0.5;
  const light = new CameraObject({
    left: -context.canvas.width * factor,
    right: context.canvas.width * factor,
    bottom: -context.canvas.height * factor,
    top: context.canvas.height * factor,
    near: -50,
    far: 200,
    orthographic: true,
  });
  light.position = lightBufferBuilder.mapData();
  light.setPosition(0, 0, 50);
  light.setEulers(0, -45, 0);
  light.updateProjectionMatrix();
  light.addUpdateCallback(() => {
    const now = performance.now();
    light.eulers[2] += 0.1;
    light.eulers[2] %= 360;
    light.updateOrthonormalVectors();
    light.updateViewMatrix();
    lightProjectionBufferBuilder.setData(getViewProjectionMatrix(light.viewMatrix, light.projectionMatrix));
  });
  scene.addObject(light);

  let objectCount = 0;

  const pole = new BaseObject();
  pole.setPosition(0, 0, 0);
  pole.setEulers(90, 0, 0);
  pole.setScale(2, 30, 2);
  pole.updateModelMatrix();
  modelViewBufferBuilder.setData(pole.modelMatrix, objectCount * 16);
  colorBufferBuilder.setData([0.75, 0.75, 0.75, 1.0], objectCount * 4);
  scene.addObject(pole);
  objectCount++;

  const floor = new BaseObject();
  floor.setPosition(0, 0, -15);
  floor.setEulers(90, 0, 0);
  floor.setScale(150, 0.5, 150);
  floor.updateModelMatrix();
  modelViewBufferBuilder.setData(floor.modelMatrix, objectCount * 16);
  colorBufferBuilder.setData([1.0, 1.0, 1.0, 1.0], objectCount * 4);
  scene.addObject(floor);
  objectCount++;

  const gravity = 0.0025;
  for (objectCount; objectCount < OBJECT_COUNT; objectCount++) {
    const scale = getRandom(0.5, 1.5);
    const upDown = Math.random() > 0.5 ? 1 : -1;
    const stuff = new BaseObject();
    stuff.setPosition(getRandom(-60, 60), getRandom(-60, 60), getRandom(5, 50));
    stuff.setEulers(0, 0, 0);
    stuff.setScale(scale, scale, scale);
    stuff.tmpIndex = objectCount;
    stuff.tmpBounce = 0.99;
    stuff.tmpVelocity = 0;
    stuff.tmpGravity = gravity;
    stuff.addUpdateCallback(() => {
      stuff.updateModelMatrix();
      stuff.tmpVelocity -= stuff.tmpGravity;
      stuff.position[2] += stuff.tmpVelocity;
      if (stuff.position[2] < -14.5) {
        stuff.tmpVelocity *= -1 * stuff.tmpBounce;
      }
      if (stuff.position[2] < -15.5) {
        stuff.tmpGravity = 0;
      }
      modelViewBufferBuilder.setData(stuff.modelMatrix, stuff.tmpIndex * 16);
    });
    colorBufferBuilder.setData([Math.random(), Math.random(), Math.random(), 1.0], objectCount * 4);
    scene.addObject(stuff);
  }
  colorBufferBuilder.writeDataToBuffer();

  scene.addUpdateEvent(() => {
    modelViewBufferBuilder.writeDataToBuffer();
    cameraProjectionBufferBuilder.writeDataToBuffer();
    lightProjectionBufferBuilder.writeDataToBuffer();
    // colorBufferBuilder.writeDataToBuffer();
    lightBufferBuilder.writeDataToBuffer();
  });

  renderDepthTextureBuilder.build();
  webgpu.observeCanvasResize(canvas, (width, height) => {
    camera.resize(width, height);
    renderDepthTextureBuilder.setTextureSize(width, height).build();
  });

  //// Pipelines

  const { pipeline: shadowPipeline } = await webgpu
    .setupPipeline("Shadow depth")
    .setLayout("auto")
    .useShaderCode(assets.shadowCode.data)
    .setVertexShader({ buffers: [vertexBufferLayout] })
    .setRenderPrimitive({
      topology: "triangle-list",
      cullMode: "back",
    })
    .setRenderDepthStencil({
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth32float",
    })
    .buildAsync();

  const { pipeline: renderPipeline } = await webgpu
    .setupPipeline("Render")
    .setLayout("auto")
    .useShaderCode(assets.shaderCode.data)
    .setVertexShader({ buffers: [vertexBufferLayout] })
    .setFragmentShader({ targets: [{ format }] })
    .setRenderPrimitive({
      topology: "triangle-list",
      cullMode: "back",
    })
    .setRenderDepthStencil({
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth32float",
    })
    .buildAsync();

  //// Bind groups

  const { bindGroup: shaderVertexBindGroup } = webgpu
    .setupBindGroup("Shader vertex bind group")
    .setLayout(renderPipeline.getBindGroupLayout(0))
    .addBuffer(modelViewBufferBuilder.buffer)
    .addBuffer(cameraProjectionBufferBuilder.buffer)
    .addBuffer(lightProjectionBufferBuilder.buffer)
    .addBuffer(colorBufferBuilder.buffer)
    .build();

  const { bindGroup: shaderFragmentBindGroup } = webgpu
    .setupBindGroup("Shader fragment bind group")
    .setLayout(renderPipeline.getBindGroupLayout(1))
    .addBuffer(lightBufferBuilder.buffer)
    .addTexture(shadowDepthTextureView)
    .addSampler(shadowDepthSampler)
    .build();

  const { bindGroup: shadowVertexBindGroup } = webgpu
    .setupBindGroup("Shadow vertex bind group")
    .setLayout(shadowPipeline.getBindGroupLayout(0))
    .addBuffer(modelViewBufferBuilder.buffer)
    .addBuffer(lightProjectionBufferBuilder.buffer)
    .build();

  //// Renderer

  /** @type {GPURenderPassDescriptor} */
  const shadowPassDescriptor = {
    colorAttachments: [],
    depthStencilAttachment: {
      view: shadowDepthTextureView,
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  };

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
    depthStencilAttachment: {
      view: renderDepthTextureBuilder.textureView,
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  };

  function frame() {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    renderPassDescriptor.depthStencilAttachment.view = renderDepthTextureBuilder.textureView;

    scene.play();

    webgpu
      .setupEncoder()

      // shadow pass
      .beginRenderPass(shadowPassDescriptor)
      .setPipeline(shadowPipeline)
      .setBindGroup(0, shadowVertexBindGroup)
      // cube
      .setVertexBuffer(0, cubeVertexBuffer)
      .setIndexBuffer(cubeIndexBuffer, "uint32")
      .drawIndexed(cubeGeometry.indices.length, 2, 0, 0, 0)
      // sphere
      .setVertexBuffer(0, sphereVertexBuffer)
      .setIndexBuffer(sphereIndexBuffer, "uint32")
      .drawIndexed(sphereGeometry.indices.length, OBJECT_COUNT - 2, 0, 0, 2)
      .end()

      // render pass
      .beginRenderPass(renderPassDescriptor)
      .setPipeline(renderPipeline)
      .setBindGroup(0, shaderVertexBindGroup)
      .setBindGroup(1, shaderFragmentBindGroup)
      // cube
      .setVertexBuffer(0, cubeVertexBuffer)
      .setIndexBuffer(cubeIndexBuffer, "uint32")
      .drawIndexed(cubeGeometry.indices.length, 2, 0, 0, 0)
      // sphere
      .setVertexBuffer(0, sphereVertexBuffer)
      .setIndexBuffer(sphereIndexBuffer, "uint32")
      .drawIndexed(sphereGeometry.indices.length, OBJECT_COUNT - 2, 0, 0, 2)
      .end()

      .submitCommandBuffer();

    requestAnimationFrame(frame);
  }

  frame();
} catch (error) {
  createModalElement("🚫 Error", error, { container: document.querySelector("main"), closeButton: false });
  console.error(error);
}
