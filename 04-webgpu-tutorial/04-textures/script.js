import { WebGPU } from "../../src/system/WebGPU.js";
import { getQueryValue } from "../../src/utilities/helpers.js";
import { createCanvasElement, createVideoElement, createModalElement } from "../../src/utilities/elements.js";
import { getRandom } from "../../src/utilities/maths.js";
import { getModelViewProjectionMatrix } from "../../src/utilities/matrices.js";
import { createCubeGeometry } from "../../src/utilities/geometries.js";
import { loadAssets } from "../../src/utilities/assets.js";
import { Scene } from "../../src/modules/Scene.js";
import { BaseObject } from "../../src/objects/BaseObject.js";
import { CameraObject } from "../../src/objects/CameraObject.js";
import { config } from "./config.js";

const textureType = getQueryValue("texture", "image");

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

  //// Assets

  const assets = await loadAssets(config.resources, true);

  const { builder: depthStencilBuilder } = webgpu.setupDepthStencil().setTextureSize(canvas.width, canvas.height).build();

  //// Buffers and scene

  const cubeVertexData = createCubeGeometry({ size: 2.0, useNormal: false, indexed: false });
  const { buffer: vertexBuffer, vertexBufferLayout } = webgpu
    .setupBuffer("Cube vertices")
    .setData(cubeVertexData.vertices)
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
  const camera = new CameraObject({ width: canvas.width, height: canvas.height });
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
      frontFace: "ccw",
    })
    .setRenderDepthStencil(depthStencilBuilder.state)
    .buildAsync();

  //// Texture variants

  // Video texture
  let videoIsPlaying = false;
  const { video } =
    textureType === "video"
      ? createVideoElement([{ src: config.videoURL, type: "video/mp4" }], {
          container: document.querySelector("article"),
          autoplay: true,
          wrapperStyle: {
            position: "absolute",
            top: "0",
            left: "0",
            width: "1px",
            height: "1px",
            overflow: "hidden",
          },
        })
      : { undefined };
  if (video instanceof HTMLVideoElement) {
    const canvasHelp = document.createElement("p");
    canvasHelp.innerHTML = `Click on the canvas to start the video texture. See: <a href="https://webkit.org/blog/6784/new-video-policies-for-ios/">New &lt;video&gt; Policies for iOS</a>`;
    document.querySelector("article").prepend(canvasHelp);

    canvas.addEventListener("click", async () => {
      await video.play().then(() => {
        videoIsPlaying = true;
      });
    });
  }

  // Canvas draw texture
  /**
   * @param {PointerEvent} event
   */
  function updateCanvasDraw(event) {
    updateCanvasDraw.drawing = updateCanvasDraw.drawing || false;
    updateCanvasDraw.lastX = updateCanvasDraw.lastX || 0;
    updateCanvasDraw.lastY = updateCanvasDraw.lastY || 0;
    updateCanvasDraw.hue = updateCanvasDraw.hue || 0;

    event.preventDefault();

    switch (event.type) {
      case "pointerup":
      case "pointerout":
        updateCanvasDraw.drawing = false;
        break;
      case "pointerdown":
        updateCanvasDraw.drawing = true;
        updateCanvasDraw.lastX = event.offsetX;
        updateCanvasDraw.lastY = event.offsetY;
        break;
      case "pointermove":
        if (!updateCanvasDraw.drawing) {
          return;
        }
        const x = event.offsetX;
        const y = event.offsetY;
        updateCanvasDraw.hue = updateCanvasDraw.hue > 360 ? 0 : updateCanvasDraw.hue + 1;
        contextDraw.strokeStyle = `hsl(${updateCanvasDraw.hue}, 90%, 50%)`;
        contextDraw.beginPath();
        contextDraw.moveTo(updateCanvasDraw.lastX, updateCanvasDraw.lastY);
        contextDraw.lineTo(x, y);
        contextDraw.stroke();
        updateCanvasDraw.lastX = x;
        updateCanvasDraw.lastY = y;
        break;
      default:
        break;
    }
  }

  const { canvas: canvasDraw } =
    textureType === "canvasDraw"
      ? createCanvasElement({
          container: document.querySelector("article"),
          width: 150,
          height: 150,
          forceDPR: 1,
          style: {
            outline: "1px solid black",
            verticalAlign: "top",
          },
        })
      : { undefined };

  const contextDraw = textureType === "canvasDraw" ? canvasDraw.getContext("2d") : undefined;

  if (textureType === "canvasDraw") {
    const canvasHelp = document.createElement("p");
    canvasHelp.innerText = "Draw on the smaller canvas!";
    document.querySelector("article").prepend(canvasHelp);

    contextDraw.fillStyle = "#999999";
    contextDraw.lineWidth = "2";
    contextDraw.lineCap = "round";
    contextDraw.lineJoin = "round";
    contextDraw.fillRect(0, 0, canvasDraw.width, canvasDraw.height);

    canvasDraw.addEventListener("pointerdown", updateCanvasDraw);
    canvasDraw.addEventListener("pointermove", updateCanvasDraw);
    canvasDraw.addEventListener("pointerup", updateCanvasDraw);
    canvasDraw.addEventListener("pointerout", updateCanvasDraw);
  }

  // Canvas GPU texture
  /**
   * @param {CanvasRenderingContext2D} context
   * @param {number[]} data
   */
  function updateCanvasGPU(context, data) {
    context.save();
    context.scale(1, -1);
    context.translate(0, -context.canvas.height);
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.fillStyle = "#ffcccc";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.fillStyle = "red";

    for (let j = 0; j < data.length; j += 6) {
      const radius = data[j + 0];
      const posX = data[j + 2];
      const posY = data[j + 3];
      const velX = data[j + 4];
      const velY = data[j + 5];
      let heading = Math.atan(velY / (velX === 0 ? Number.EPSILON : velX));
      if (velX < 0) {
        heading += Math.PI;
      }
      const newPosX = posX + Math.cos(heading) * Math.sqrt(2) * radius;
      const newPosY = posY + Math.sin(heading) * Math.sqrt(2) * radius;

      context.beginPath();
      context.arc(posX, posY, radius, 0, 2 * Math.PI, true);
      context.moveTo(newPosX, newPosY);
      context.arc(posX, posY, radius, heading - Math.PI / 4, heading + Math.PI / 4, true);
      context.lineTo(newPosX, newPosY);
      context.closePath();
      context.fill();
    }
    context.restore();
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @returns {Object}
   */
  async function initCanvasGPU(canvas) {
    const NUM_BALLS = 100;
    const BUFFER_SIZE = NUM_BALLS * 6 * Float32Array.BYTES_PER_ELEMENT;
    const MIN_RADIUS = 2;
    const MAX_RADIUS = 6;
    const inputStates = new Float32Array(new ArrayBuffer(BUFFER_SIZE));
    for (let i = 0; i < NUM_BALLS; i++) {
      inputStates[i * 6 + 0] = getRandom(MIN_RADIUS, MAX_RADIUS); // radius
      inputStates[i * 6 + 1] = 0; // padding
      inputStates[i * 6 + 2] = getRandom(0, canvas.width); // position.x
      inputStates[i * 6 + 3] = getRandom(0, canvas.height); // position.y
      inputStates[i * 6 + 4] = getRandom(-25, 25); // velocity.x
      inputStates[i * 6 + 5] = getRandom(-25, 25); // velocity.y
    }
    const { builder: inputBufferBuilder, buffer: inputBuffer } = webgpu
      .setupBuffer("Input buffer")
      .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
      .setData(inputStates)
      .build();
    const { buffer: outputBuffer } = webgpu
      .setupBuffer("Output buffer")
      .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC)
      .setSize(BUFFER_SIZE)
      .build();
    const { buffer: stagingBuffer } = webgpu
      .setupBuffer("Staging buffer")
      .setUsage(GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST)
      .setSize(BUFFER_SIZE)
      .build();
    const { buffer: sceneBuffer } = webgpu
      .setupBuffer("Scene buffer")
      .setUsage(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
      .setData(new Float32Array([canvas.width, canvas.height]))
      .build();
    const { bindGroup, bindGroupLayout } = webgpu
      .setupBindGroup("Bind group")
      .addBuffer(inputBuffer, GPUShaderStage.COMPUTE, { type: "read-only-storage" })
      .addBuffer(outputBuffer, GPUShaderStage.COMPUTE, { type: "storage" })
      .addBuffer(sceneBuffer, GPUShaderStage.COMPUTE, { type: "read-only-storage" })
      .build();
    const { pipeline } = await webgpu
      .setupPipeline("Compute pipeline")
      .addBindGroupLayout(bindGroupLayout)
      .useShaderCode(assets.computeCode.data)
      .setComputeShader({ entryPoint: "main" })
      .buildAsync();

    return { BUFFER_SIZE, inputBufferBuilder, inputBuffer, outputBuffer, stagingBuffer, sceneBuffer, bindGroup, bindGroupLayout, pipeline };
  }

  const { canvas: canvasGPU } =
    textureType === "canvasGPU"
      ? createCanvasElement({
          container: document.querySelector("article"),
          width: 150,
          height: 150,
          forceDPR: 1,
          style: {
            outline: "1px solid black",
            verticalAlign: "top",
          },
        })
      : { undefined };

  const contextGPU = textureType === "canvasGPU" ? canvasGPU.getContext("2d") : undefined;
  const objectsGPU = textureType === "canvasGPU" ? await initCanvasGPU(canvasGPU) : undefined;

  if (textureType === "canvasGPU") {
    const canvasHelp = document.createElement("p");
    canvasHelp.innerHTML = 'The smaller canvas runs the <a href="./index.html?page=02-collision-simulation">Collision Simulation</a> lesson.';
    document.querySelector("article").prepend(canvasHelp);
  }

  //// Textures and bind groups

  const { bindGroup } = webgpu.setupBindGroup("Uniform bind group").setLayout(pipeline.getBindGroupLayout(0)).addBuffer(mvpBuffer).build();

  let texture = null;
  let textureView = null;
  let sampler = null;
  let bindGroupTexture = null;

  if (textureType === "video") {
    sampler = webgpu.setupTextureView().createSampler();
  } else if (textureType === "image") {
    ({ texture, textureView, sampler } = webgpu
      .setupTextureView()
      .setTextureUsage(GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT)
      .loadBitmaps([assets.image])
      .build());
    ({ bindGroup: bindGroupTexture } = webgpu
      .setupBindGroup("Image texture bind group")
      .setLayout(pipeline.getBindGroupLayout(1))
      .addTexture(textureView, GPUShaderStage.FRAGMENT)
      .addSampler(sampler, GPUShaderStage.FRAGMENT)
      .build());
  } else if (textureType === "canvasDraw" || textureType === "canvasGPU") {
    ({ texture, textureView, sampler } = webgpu
      .setupTextureView()
      .setTextureSize(150, 150)
      .setTextureUsage(GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT)
      .build());
    ({ bindGroup: bindGroupTexture } = webgpu
      .setupBindGroup("Image texture bind group")
      .setLayout(pipeline.getBindGroupLayout(1))
      .addTexture(textureView, GPUShaderStage.FRAGMENT)
      .addSampler(sampler, GPUShaderStage.FRAGMENT)
      .build());
  }

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

  function animateFrame() {
    return new Promise((event) => requestAnimationFrame(event));
  }

  while (true) {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    scene.play();

    if (textureType === "video" && videoIsPlaying) {
      textureView = webgpu.device.importExternalTexture({ source: video });
      ({ bindGroup: bindGroupTexture } = webgpu
        .setupBindGroup("Video texture bind group")
        .setLayout(pipeline.getBindGroupLayout(1))
        .addTexture(textureView, GPUShaderStage.FRAGMENT)
        .addSampler(sampler, GPUShaderStage.FRAGMENT)
        .build());
    } else if (textureType === "canvasDraw") {
      webgpu.device.queue.copyExternalImageToTexture({ source: canvasDraw }, { texture }, [canvasDraw.width, canvasDraw.height]);
    } else if (textureType === "canvasGPU") {
      webgpu.device.queue.copyExternalImageToTexture({ source: canvasGPU }, { texture }, [canvasGPU.width, canvasGPU.height]);
    }

    if (textureType === "canvasGPU") {
      webgpu
        .setupEncoder()
        .beginComputePass()
        .setPipeline(objectsGPU.pipeline)
        .setBindGroup(0, objectsGPU.bindGroup)
        .dispatchWorkgroups(Math.ceil(objectsGPU.BUFFER_SIZE / 64))
        .end()
        .copyBufferToBuffer(objectsGPU.outputBuffer, 0, objectsGPU.stagingBuffer, 0, objectsGPU.BUFFER_SIZE)
        .beginRenderPass(renderPassDescriptor)
        .setPipeline(pipeline)
        .setVertexBuffer(0, vertexBuffer)
        .setBindGroup(0, bindGroup)
        .setBindGroup(1, bindGroupTexture)
        .draw(cubeVertexData.vertices.length / 5, 1)
        .end()
        .submitCommandBuffer();

      await objectsGPU.stagingBuffer.mapAsync(GPUMapMode.READ, 0, objectsGPU.BUFFER_SIZE);
      const copyArrayBuffer = objectsGPU.stagingBuffer.getMappedRange(0, objectsGPU.BUFFER_SIZE).slice();
      const updatedStates = new Float32Array(copyArrayBuffer);
      objectsGPU.stagingBuffer.unmap();
      updateCanvasGPU(contextGPU, updatedStates);
      objectsGPU.inputBufferBuilder.setData(updatedStates).writeDataToBuffer();
    } else if (textureType === "video") {
      if (videoIsPlaying) {
        webgpu
          .setupEncoder()
          .beginRenderPass(renderPassDescriptor)
          .setPipeline(pipeline)
          .setVertexBuffer(0, vertexBuffer)
          .setBindGroup(0, bindGroup)
          .setBindGroup(1, bindGroupTexture)
          .draw(cubeVertexData.vertices.length / 5, 1)
          .end()
          .submitCommandBuffer();
      }
    } else {
      webgpu
        .setupEncoder()
        .beginRenderPass(renderPassDescriptor)
        .setPipeline(pipeline)
        .setVertexBuffer(0, vertexBuffer)
        .setBindGroup(0, bindGroup)
        .setBindGroup(1, bindGroupTexture)
        .draw(cubeVertexData.vertices.length / 5, 1)
        .end()
        .submitCommandBuffer();
    }

    await animateFrame();
  }

  frame();
} catch (error) {
  createModalElement("🛑 Error", error);
  console.error(error);
}
