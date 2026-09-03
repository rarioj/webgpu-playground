import { WebGPU } from "../../src/system/WebGPU.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { createCanvasElement, createModalElement, createVideoElement, createTweakElement } from "../../src/utilities/elements.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { Scene } from "../../src/modules/Scene.js";
import { FirstPersonControl } from "../../src/modules/FirstPersonControl.js";
import { getModelViewProjectionMatrix } from "../../src/utilities/matrices.js";

const videoTexture = getQueryValue("texture", "video");

try {
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
  const format = context.getConfiguration().format;

  //// Assets

  const assets = await loadAssets([
    {
      name: "shaderCode",
      url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
      type: "text",
    },
  ]);

  const textureBuilder = webgpu.setupTexture("Sampler generator");

  const canvasHelp = document.createElement("p");
  canvasHelp.innerHTML =
    videoTexture === "video"
      ? `Click on the canvas to start the video texture!`
      : `Click on the canvas and grant permission to use the camera to start the video texture!`;
  document.querySelector("article").prepend(canvasHelp);

  let videoIsPlaying = false;

  const { video } = createVideoElement(videoTexture === "video" ? [{ src: "./assets/videos/pug-dog-screen-nature-texture.mp4", type: "video/mp4" }] : [], {
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
  });

  if (videoTexture === "video") {
    canvas.addEventListener("click", async () => {
      await video.play().then(() => {
        if (!videoIsPlaying) {
          requestAnimationFrame(render);
          videoIsPlaying = true;
        }
      });
    });
  } else {
    canvas.addEventListener("click", async () => {
      if (!videoIsPlaying) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          video.srcObject = videoStream;
          await video.play().then(() => {
            if (!videoIsPlaying) {
              requestAnimationFrame(render);
              videoIsPlaying = true;
            }
          });
        } catch (error) {
          throw new Error(error);
        }
      }
    });
  }

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

  //// Bind groups

  const scene = new Scene();

  const camera = new CameraObject({ width: canvas.width, height: canvas.height, far: 5000, fov: Math.PI / 3 });
  camera.setPosition(-2.5, -0.23, -0.2);
  camera.setEulers(0, 0, 0);
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
  for (let i = 0; i < 4; i++) {
    const bufferBuilder = webgpu
      .setupBuffer("Uniforms for Quad")
      .setUsage(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
      .loadBufferData(new Float32Array(16)) // 4x4 matrix
      .build();

    const object = new BaseObject();
    object.setPosition(i % 2 ? -0.2 : 0.5, (i % 2 ? i - 1.65 : -i) * 0.75, i % 2 ? 0.75 : -0.5);
    object.setEulers(0, i % 2 ? 45 : -45, i % 2 ? -90 : 90);
    object.addUpdateCallback(() => {
      object.updateModelMatrix();
      bufferBuilder.setData(getModelViewProjectionMatrix(object.modelMatrix, camera.viewMatrix, camera.projectionMatrix));
      bufferBuilder.writeDataToBuffer();
    });
    scene.addObject(object);
    objectInfos.push(bufferBuilder.buffer);
  }

  const filterOptions = { options: { linear: "linear", nearest: "nearest" } };
  const tweak = createTweakElement("magFilter", "linear", filterOptions);
  createTweakElement("minFilter", "linear", filterOptions);

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
        depthStencilAttachment: depthStencilBuilder.attachment,
      })
      .setPipeline(pipeline);

    textureBuilder.createSampler({
      magFilter: tweak.magFilter,
      minFilter: tweak.minFilter,
    });

    for (let i = 0; i < objectInfos.length; i++) {
      const texture = webgpu.device.importExternalTexture({ source: video });

      const { bindGroup } = webgpu
        .setupBindGroup()
        .setLayout(pipeline.getBindGroupLayout(0))
        .addTexture(texture)
        .addSampler(textureBuilder.sampler)
        .addBuffer(objectInfos[i])
        .build();

      encoderBuilder.setBindGroup(0, bindGroup).draw(6);
    }

    encoderBuilder.end().submitCommandBuffer();

    requestAnimationFrame(render);
  }
} catch (error) {
  createModalElement("🚫 Error", error, { container: document.querySelector("main"), closeButton: false });
  console.error(error);
}
