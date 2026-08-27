import { WebGPU } from "../../src/system/WebGPU.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { createCanvasElement, createModalElement, createVideoElement, createTweakElement } from "../../src/utilities/elements.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { Scene } from "../../src/modules/Scene.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";
import { getModelViewProjectionMatrix } from "../../src/utilities/matrices.js";

const texture = getQueryValue("texture", "image1");
const imagePath = texture === "image2" ? `./${getQueryValue("page")}/tile.webp` : `./${getQueryValue("page")}/Ff.webp`;
const videoPath = texture === "video2" ? "./assets/videos/pug-dog-screen-nature-texture.mp4" : "./assets/videos/nature-froest-autumn-autumn-forest.mp4";

try {
  //// Initialisation

  const { canvas } = createCanvasElement({
    container: document.querySelector("article"),
    width: 512,
    height: 512,
    forceDPR: 1,
    style: {
      outline: "1px solid black",
    },
  });
  const webgpu = await WebGPU.init();
  const context = webgpu.createCanvasContext(canvas);
  const format = context.getConfiguration().format;

  /** @type {CanvasRenderingContext2D} */
  let context2d;
  if (texture === "canvas1" || texture === "canvas2") {
    const size = 150;
    const { canvas } = createCanvasElement({
      container: document.querySelector("article"),
      width: size,
      height: size,
      forceDPR: 1,
      noWrapper: true,
      style: {
        height: `${size}px`,
        outline: "1px solid black",
        verticalAlign: "top",
        width: `${size}px`,
      },
    });
    context2d = canvas.getContext("2d");

    if (texture === "canvas2") {
      const canvasHelp = document.createElement("p");
      canvasHelp.innerText = "Draw on the smaller canvas!";
      document.querySelector("article").prepend(canvasHelp);

      context2d.fillStyle = "#999999";
      context2d.lineWidth = "2";
      context2d.lineCap = "round";
      context2d.lineJoin = "round";
      context2d.fillRect(0, 0, context2d.canvas.width, context2d.canvas.height);

      context2d.canvas.addEventListener("pointerdown", updateCanvas2);
      context2d.canvas.addEventListener("pointermove", updateCanvas2);
      context2d.canvas.addEventListener("pointerup", updateCanvas2);
      context2d.canvas.addEventListener("pointerout", updateCanvas2);
    }
  }

  /** @type {HTMLVideoElement} */
  let video;
  let videoIsPlaying = false;
  if (texture === "video1" || texture === "video2") {
    ({ video } = createVideoElement([{ src: videoPath, type: "video/mp4" }], {
      container: document.querySelector("article"),
      autoplay: false,
      wrapperStyle: {
        position: "absolute",
        top: "0",
        left: "0",
        width: "1px",
        height: "1px",
        overflow: "hidden",
      },
    }));

    const canvasHelp = document.createElement("p");
    canvasHelp.innerHTML = `Click on the canvas to start the video texture!`;
    document.querySelector("article").prepend(canvasHelp);

    canvas.addEventListener("click", async () => {
      await video.play().then(() => {
        if (!videoIsPlaying) {
          initObjectInfos();
        }
        videoIsPlaying = true;
      });
    });
  }

  //// Assets

  const assets = await loadAssets([
    {
      name: "shaderCode",
      url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
      type: "text",
    },
    {
      name: "image",
      url: imagePath,
      type: "bitmap",
      options: { colorSpaceConversion: "none", imageOrientation: "flipY" },
    },
  ]);

  const bitmapData =
    texture === "image1" || texture === "image2"
      ? assets.image
      : texture === "canvas1" || texture === "canvas2"
        ? { group: "__default__", data: context2d.canvas }
        : texture === "video1" || texture === "video2"
          ? { group: "__default__", data: video }
          : null;

  const depthStencilBuilder = webgpu.setupDepthStencil().setTextureSize(canvas.width, canvas.height).build();

  //// Pipelines

  const { pipeline } = await webgpu
    .setupPipeline("Primary pipeline")
    .setLayout("auto")
    .useShaderCode(assets.shaderCode.data)
    .setVertexShader()
    .setFragmentShader({ targets: [{ format }] })
    .setRenderDepthStencil(depthStencilBuilder.state)
    .buildAsync();

  //// Scene, textures, and bind groups

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
  let textureBuilder;
  let tweak;

  function initObjectInfos() {
    textureBuilder = webgpu
      .setupTexture(`Bitmap texture`)
      .setTextureUsage(GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT)
      .setTextureFormat("rgba8unorm")
      .loadImageTexture([bitmapData], { enableMips: true })
      .build({ createView: false, createSampler: true });

    for (let i = 0; i < 16; i++) {
      const bufferBuilder = webgpu
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
        bufferBuilder.setData(getModelViewProjectionMatrix(object.modelMatrix, camera.viewMatrix, camera.projectionMatrix));
        bufferBuilder.writeDataToBuffer();
      });
      scene.addObject(object);

      const { bindGroup } = webgpu
        .setupBindGroup()
        .setLayout(pipeline.getBindGroupLayout(0))
        .addTexture(textureBuilder.texture)
        .addSampler(textureBuilder.sampler)
        .addBuffer(bufferBuilder.buffer)
        .build();
      objectInfos.push({ bindGroup, buffer: bufferBuilder.buffer });
    }

    const addressModeOptions = { options: { repeat: "repeat", "mirror-repeat": "mirror-repeat", "clamp-to-edge": "clamp-to-edge" } };
    const filterOptions = { options: { linear: "linear", nearest: "nearest" } };
    // const tweak = createTweakElement("addressModeU", "repeat", addressModeOptions, updateObjectInfos);
    tweak = createTweakElement("addressModeV", "repeat", addressModeOptions, updateObjectInfos);
    // createTweakElement("addressModeW", "repeat", addressModeOptions, updateObjectInfos);
    createTweakElement("magFilter", "linear", filterOptions, updateObjectInfos);
    createTweakElement("minFilter", "linear", filterOptions, updateObjectInfos);
    createTweakElement("mipmapFilter", "linear", filterOptions, updateObjectInfos);
  }

  function updateObjectInfos() {
    textureBuilder.createSampler({
      // addressModeU: tweak.addressModeU,
      addressModeV: tweak.addressModeV,
      // addressModeW: tweak.addressModeW,
      magFilter: tweak.magFilter,
      minFilter: tweak.minFilter,
      mipmapFilter: tweak.mipmapFilter,
    });

    for (let i = 0; i < objectInfos.length; i++) {
      const { bindGroup } = webgpu
        .setupBindGroup()
        .setLayout(pipeline.getBindGroupLayout(0))
        .addTexture(textureBuilder.texture)
        .addSampler(textureBuilder.sampler)
        .addBuffer(objectInfos[i].buffer)
        .build();
      objectInfos[i].bindGroup = bindGroup;
    }
  }

  function updateCanvas1(time) {
    const size = context2d.canvas.width;
    const half = size / 2;
    time *= 0.0001;
    context2d.clearRect(0, 0, size, size);
    context2d.save();
    context2d.translate(half, half);
    const num = 20;
    for (let i = 0; i < num; ++i) {
      context2d.fillStyle = `hsl(${(((i / num) * 0.2 + time * 0.1) * 360) | 0}, ${1 * 100}%, ${((i % 2) * 0.5 * 100) | 0}%)`;
      context2d.fillRect(-half, -half, size, size);
      context2d.rotate(time * 0.5);
      context2d.scale(0.85, 0.85);
      context2d.translate(size / 16, 0);
    }
    context2d.restore();
  }

  function updateCanvas2(event) {
    updateCanvas2.drawing = updateCanvas2.drawing || false;
    updateCanvas2.lastX = updateCanvas2.lastX || 0;
    updateCanvas2.lastY = updateCanvas2.lastY || 0;
    updateCanvas2.hue = updateCanvas2.hue || 0;

    event.preventDefault();

    switch (event.type) {
      case "pointerup":
      case "pointerout":
        updateCanvas2.drawing = false;
        break;
      case "pointerdown":
        updateCanvas2.drawing = true;
        updateCanvas2.lastX = event.offsetX;
        updateCanvas2.lastY = event.offsetY;
        break;
      case "pointermove":
        if (!updateCanvas2.drawing) {
          return;
        }
        const x = event.offsetX;
        const y = event.offsetY;
        updateCanvas2.hue = updateCanvas2.hue > 360 ? 0 : updateCanvas2.hue + 1;
        context2d.strokeStyle = `hsl(${updateCanvas2.hue}, 90%, 50%)`;
        context2d.beginPath();
        context2d.moveTo(updateCanvas2.lastX, updateCanvas2.lastY);
        context2d.lineTo(x, y);
        context2d.stroke();
        updateCanvas2.lastX = x;
        updateCanvas2.lastY = y;
        break;
      default:
        break;
    }
  }

  //// Renderer

  /** @type {GPURenderPassDescriptor} */
  const renderPass = {
    colorAttachments: [
      {
        view: undefined,
        clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
    depthStencilAttachment: depthStencilBuilder.attachment,
  };

  if (texture !== "video1" && texture !== "video2") {
    initObjectInfos();
  }

  function renderDefault(time) {
    renderPass.colorAttachments[0].view = context.getCurrentTexture().createView();
    scene.play();
    if (context2d) {
      if (texture === "canvas1") {
        updateCanvas1(time);
      }
      textureBuilder.build({ createTexture: false, createView: false, createSampler: true });
    }

    const encoderBuilder = webgpu.setupEncoder().beginRenderPass(renderPass).setPipeline(pipeline);
    for (let i = 0; i < objectInfos.length; i++) {
      encoderBuilder.setBindGroup(0, objectInfos[i].bindGroup).draw(6);
    }
    encoderBuilder.end().submitCommandBuffer();
    requestAnimationFrame(renderDefault);
  }

  function renderVideo(time) {
    renderPass.colorAttachments[0].view = context.getCurrentTexture().createView();
    scene.play();
    if (videoIsPlaying) {
      textureBuilder.build({ createTexture: false, createView: false, createSampler: true });

      const encoderBuilder = webgpu.setupEncoder().beginRenderPass(renderPass).setPipeline(pipeline);
      for (let i = 0; i < objectInfos.length; i++) {
        encoderBuilder.setBindGroup(0, objectInfos[i].bindGroup).draw(6);
      }
      encoderBuilder.end().submitCommandBuffer();
    }
    requestAnimationFrame(renderVideo);
  }

  requestAnimationFrame(texture === "video1" || texture === "video2" ? renderVideo : renderDefault);
} catch (error) {
  createModalElement("🚫 Error", error, { container: document.querySelector("main"), closeButton: false });
  console.error(error);
}
