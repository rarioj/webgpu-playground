import { WebGPU } from "../../src/system/WebGPU.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { createCanvasElement, createModalElement, createTweakElement } from "../../src/utilities/elements.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { Scene } from "../../src/modules/Scene.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";
import { getModelViewProjectionMatrix } from "../../src/utilities/matrices.js";
import { generateMipmaps } from "./functions.js";

function createCheckerMipmap() {
  const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const levels = [
    { size: 64, color: "rgb(128,0,255)" },
    { size: 32, color: "rgb(0,255,0)" },
    { size: 16, color: "rgb(255,0,0)" },
    { size: 8, color: "rgb(255,255,0)" },
    { size: 4, color: "rgb(0,0,255)" },
    { size: 2, color: "rgb(0,255,255)" },
    { size: 1, color: "rgb(255,0,255)" },
  ];
  return levels.map(({ size, color }, i) => {
    context.canvas.width = size;
    context.canvas.height = size;
    context.fillStyle = i & 1 ? "#000" : "#fff";
    context.fillRect(0, 0, size, size);
    context.fillStyle = color;
    context.fillRect(0, 0, size / 2, size / 2);
    context.fillRect(size / 2, size / 2, size / 2, size / 2);
    return context.getImageData(0, 0, size, size);
  });
}

function createBlendedMipmap() {
  const w = [255, 255, 255, 255];
  const r = [255, 0, 0, 255];
  const b = [0, 28, 116, 255];
  const y = [255, 231, 0, 255];
  const g = [58, 181, 75, 255];
  const a = [38, 123, 167, 255];
  const data = new Uint8Array(
    [
      [w, r, r, r, r, r, r, a, a, r, r, r, r, r, r, w],
      [w, w, r, r, r, r, r, a, a, r, r, r, r, r, w, w],
      [w, w, w, r, r, r, r, a, a, r, r, r, r, w, w, w],
      [w, w, w, w, r, r, r, a, a, r, r, r, w, w, w, w],
      [w, w, w, w, w, r, r, a, a, r, r, w, w, w, w, w],
      [w, w, w, w, w, w, r, a, a, r, w, w, w, w, w, w],
      [w, w, w, w, w, w, w, a, a, w, w, w, w, w, w, w],
      [b, b, b, b, b, b, b, b, a, y, y, y, y, y, y, y],
      [b, b, b, b, b, b, b, g, y, y, y, y, y, y, y, y],
      [w, w, w, w, w, w, w, g, g, w, w, w, w, w, w, w],
      [w, w, w, w, w, w, r, g, g, r, w, w, w, w, w, w],
      [w, w, w, w, w, r, r, g, g, r, r, w, w, w, w, w],
      [w, w, w, w, r, r, r, g, g, r, r, r, w, w, w, w],
      [w, w, w, r, r, r, r, g, g, r, r, r, r, w, w, w],
      [w, w, r, r, r, r, r, g, g, r, r, r, r, r, w, w],
      [w, r, r, r, r, r, r, g, g, r, r, r, r, r, r, w],
    ].flat(2),
  );
  return generateMipmaps(data, 16);
}

const textureLabel = getQueryValue("pattern", "blended") === "blended" ? "blended" : "checker";
const textureData = textureLabel === "blended" ? createBlendedMipmap() : createCheckerMipmap();

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

  const {
    builder: textureBuilder,
    texture,
    sampler,
  } = webgpu
    .setupTexture(`Raw texture ${textureLabel}`)
    .setTextureUsage(GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST)
    .setTextureFormat("rgba8unorm")
    .loadTextureData(textureData, true)
    .build();

  //// Pipelines

  const { pipeline } = await webgpu
    .setupPipeline("Primary pipeline")
    .setLayout("auto")
    .useShaderCode(assets.shaderCode.data)
    .setVertexShader()
    .setFragmentShader({ targets: [{ format }] })
    .buildAsync();

  //// Bind groups

  const scene = new Scene();

  const camera = new CameraObject({ width: canvas.width, height: canvas.height, far: 5000, fov: Math.PI / 3 });
  camera.setPosition(1, 4.2, 0);
  camera.setEulers(0, 0, 180);
  camera.updateProjectionMatrix();
  camera.addUpdateCallback(() => {
    camera.updateOrthonormalVectors();
    camera.updateViewMatrix();
    camera.move();
  });
  scene.addObject(camera);

  new FirstPersonControl(camera, context.canvas, { debug: true, moveSpeed: 0.02, orientSpeed: 0.2 });

  /** @type {{bindGroup: GPUBindGroup, buffer: GPUBuffer}[]} */
  const objectInfos = [];
  for (let i = 0; i < 16; i++) {
    const { builder: bufferBuilder, buffer } = webgpu
      .setupBuffer("Uniforms for Quad")
      .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
      .loadBufferData(new Float32Array(16)) // 4x4 matrix
      .build();

    const object = new BaseObject();
    object.setPosition(0, (i % 2 ? i - 1 : i) * 0.525, i % 2 ? 1 : -1);
    object.setEulers(0, 0, 90);
    object.setScale(1, 50, 1);
    object.addUpdateCallback(() => {
      object.updateModelMatrix();
      bufferBuilder.data.set(getModelViewProjectionMatrix(object.modelMatrix, camera.viewMatrix, camera.projectionMatrix));
      bufferBuilder.writeDataToBuffer();
    });
    scene.addObject(object);

    const { bindGroup } = webgpu.setupBindGroup().setLayout(pipeline.getBindGroupLayout(0)).addTexture(texture).addSampler(sampler).addBuffer(buffer).build();
    objectInfos.push({ bindGroup, buffer });
  }

  function updateObjectInfos() {
    const sampler = textureBuilder.createSampler({
      addressModeU: tweak.addressModeU,
      addressModeV: tweak.addressModeV,
      addressModeW: tweak.addressModeW,
      magFilter: tweak.magFilter,
      minFilter: tweak.minFilter,
      mipmapFilter: tweak.mipmapFilter,
    });

    for (let i = 0; i < objectInfos.length; i++) {
      const { bindGroup } = webgpu
        .setupBindGroup()
        .setLayout(pipeline.getBindGroupLayout(0))
        .addTexture(texture)
        .addSampler(sampler)
        .addBuffer(objectInfos[i].buffer)
        .build();
      objectInfos[i].bindGroup = bindGroup;
    }
  }

  const addressModeOptions = { options: { repeat: "repeat", "mirror-repeat": "mirror-repeat", "clamp-to-edge": "clamp-to-edge" } };
  const filterOptions = { options: { linear: "linear", nearest: "nearest" } };
  let needsUpdate = false;
  const tweak = createTweakElement("addressModeU", "repeat", addressModeOptions, updateObjectInfos);
  createTweakElement("addressModeV", "repeat", addressModeOptions, updateObjectInfos);
  createTweakElement("addressModeW", "repeat", addressModeOptions, updateObjectInfos);
  createTweakElement("magFilter", "linear", filterOptions, updateObjectInfos);
  createTweakElement("minFilter", "linear", filterOptions, updateObjectInfos);
  createTweakElement("mipmapFilter", "linear", filterOptions, updateObjectInfos);

  //// Renderer

  function render() {
    scene.play();

    const encoderBuilder = webgpu
      .setupEncoder()
      .beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1.0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      })
      .setPipeline(pipeline);

    for (let i = 0; i < objectInfos.length; i++) {
      encoderBuilder.setBindGroup(0, objectInfos[i].bindGroup).draw(6);
    }

    encoderBuilder.end().submitCommandBuffer();

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
} catch (error) {
  createModalElement("🛑 Error", error, { container: document.querySelector("main") });
  console.error(error);
}
