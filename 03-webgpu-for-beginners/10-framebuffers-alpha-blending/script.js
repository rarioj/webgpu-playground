import { WebGPUWrapper } from "./library/core/WebGPUWrapper.js";
import { loadResources, parseObjCode } from "./library/helper/utility.js";
import { resourceArray, vertexMap } from "./config.js";
import { FirstPersonCamera } from "./library/component/FirstPersonCamera.js";
import { Scene } from "./Scene.js";
import { BasicMesh } from "./library/component/BasicMesh.js";

// --- WebGPU initialisation
const canvas = document.querySelector("canvas");
const webgpu = new WebGPUWrapper(canvas);
await webgpu.init();
const { device, context, format } = webgpu;

// --- Load all images/assets/models
const resources = await loadResources(resourceArray);

// --- Set up camera, scene, and all the objects in the scene
const camera = new FirstPersonCamera(canvas, { far: 100 });
camera.position = [-7, -0.5, 0.5];
camera.debugKeyPress = document.getElementById("event-keypress");
camera.debugMouseMove = document.getElementById("event-mousemove");
const scene = new Scene();
const triangle = new BasicMesh(device, vertexMap.triangle);
const quad = new BasicMesh(device, vertexMap.quad);
const objmesh = new BasicMesh(device, parseObjCode(resources.model));

// --- Set up all buffers
const cameraBuffer = device.createBuffer({
  size: 4 * 4 * 3, // 4 bytes (float) * 3 types (forward, right, up)
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const uniformBuffer = device.createBuffer({
  size: 4 * 4 * 4 * 2, // 4x4 matrix * 4 bytes (float) * 2 types (projection, view)
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const objectBuffer = device.createBuffer({
  size: 4 * 4 * 4 * 1024,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
const timeBuffer = device.createBuffer({
  size: 4, // 4 bytes (float)
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

// --- Set up texture views and samplers
const {
  view: skyView,
  sampler: skySampler,
  bindGroupBuilder: skyBindGroupBuilder,
} = await webgpu.createTextureViewSampler(resources.skyImages, {
  textureViewDescriptor: { dimension: "cube" },
});
const { bindGroupLayout: skyBindGroupLayout, bindGroup: skyBindGroup } = skyBindGroupBuilder
  .setLabel("Sky bind group", "Sky bind group layout")
  .addBuffer(cameraBuffer, GPUShaderStage.VERTEX, { type: "uniform" })
  .build();

const {
  view: imageView,
  sampler: imageSampler,
  bindGroupBuilder: imageBindGroupBuilder,
} = await webgpu.createTextureViewSampler(resources.assetImages, {
  enableMipmap: true,
  samplerDescriptor: {
    maxAnisotropy: 4,
    minFilter: "linear",
    mipmapFilter: "linear",
  },
});
const { bindGroupLayout: fragmentBindGroup, bindGroup: shaderBindGroup } = imageBindGroupBuilder
  .setLabel("Fragment bind group", "Fragment bind group layout")
  .build();

const {
  view: alertView,
  sampler: alertSampler,
  bindGroupBuilder: alertBindGroupBuilder,
} = await webgpu.createTextureViewSampler(null, {
  textureDescriptor: {
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  },
});
const { bindGroupLayout: alertBindGroupLayout, bindGroup: alertBindGroup } = alertBindGroupBuilder
  .setLabel("Alert bind group", "Alert bind group layout")
  .addBuffer(timeBuffer, GPUShaderStage.FRAGMENT, { type: "uniform" })
  .build();

const { view: hudView, sampler: hudSampler, bindGroupBuilder: hudBindGroupBuilder } = await webgpu.createTextureViewSampler([resources.hudImage]);
const { bindGroupLayout: hudBindGroupLayout, bindGroup: hudBindGroup } = hudBindGroupBuilder.setLabel("HUD bind group", "HUD bind group layout").build();

// --- Set up depth stencil
const { state: depthStencil, texture: depthStencilTexture, view: depthStencilView, attachment: depthStencilAttachment } = webgpu.setupDepthStencil();

// --- Set up remaining bind group layouts and bind groups
const { bindGroupLayout: vertexBindGroupLayout, bindGroup: vertexBindGroup } = webgpu
  .setupBindGroup()
  .setLabel("Vertex bind group", "Vertex bind group layout")
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX)
  .addBuffer(objectBuffer, GPUShaderStage.VERTEX, { type: "read-only-storage", hasDynamicOffset: false })
  .build();

// --- Set up pipeline layouts and pipelines
const skyModule = webgpu.createShaderModule(resources.sky);
const { pipeline: skyPipeline } = webgpu
  .setupPipeline()
  .setLabel("Sky pipeline", "Sky pipeline layout")
  .addBindGroupLayout(skyBindGroupLayout)
  .setVertexShader(skyModule, "vertexMain")
  .setFragmentShader(skyModule, "fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .setDepthStencil(depthStencil)
  .build();

const shaderModule = webgpu.createShaderModule(resources.shader);
const { pipeline: shaderPipeline } = webgpu
  .setupPipeline()
  .setLabel("Fragment pipeline", "Fragment pipeline layout")
  .addBindGroupLayout(vertexBindGroupLayout)
  .addBindGroupLayout(fragmentBindGroup)
  .setVertexShader(shaderModule, "vertexMain", { buffers: [triangle.bufferLayout] })
  .setFragmentShader(shaderModule, "fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .setDepthStencil(depthStencil)
  .build();

const alertModule = webgpu.createShaderModule(resources.alert);
const { pipeline: alertPipeline } = webgpu
  .setupPipeline()
  .setLabel("Alert pipeline", "Alert pipeline layout")
  .addBindGroupLayout(alertBindGroupLayout)
  .setVertexShader(alertModule, "vertexMain")
  .setFragmentShader(alertModule, "fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .build();

const hudModule = webgpu.createShaderModule(resources.hud);
const { pipeline: hudPipeline } = webgpu
  .setupPipeline()
  .setLabel("HUD pipeline", "HUD pipeline layout")
  .addBindGroupLayout(hudBindGroupLayout)
  .setVertexShader(hudModule, "vertexMain")
  .setFragmentShader(hudModule, "fragmentMain", {
    targets: [
      {
        format,
        blend: {
          color: {
            operation: "add",
            srcFactor: "src-alpha",
            dstFactor: "one-minus-src-alpha",
          },
          alpha: {
            operation: "add",
            srcFactor: "one",
            dstFactor: "zero",
          },
        },
      },
    ],
  })
  .setPrimitive({ topology: "triangle-list" })
  .build();

const dy = Math.tan(Math.PI / 8);
const dx = (dy * canvas.width) / canvas.height;
const startTime = performance.now();

/**
 * @param {GPUCommandEncoder} encoder
 */
function drawWorld(encoder) {
  scene.update();
  camera.update();

  const cameraData = new Float32Array([
    camera.forward[0],
    camera.forward[1],
    camera.forward[2],
    0.0,
    dx * camera.right[0],
    dx * camera.right[1],
    dx * camera.right[2],
    0.0,
    dy * camera.up[0],
    dy * camera.up[1],
    dy * camera.up[2],
    0.0,
  ]);

  device.queue.writeBuffer(objectBuffer, 0, scene.objectData, 0, scene.objectData.length);
  device.queue.writeBuffer(uniformBuffer, 0, camera.view);
  device.queue.writeBuffer(uniformBuffer, 64, camera.projection);
  device.queue.writeBuffer(cameraBuffer, 0, cameraData, 0, 12);

  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        // view: context.getCurrentTexture().createView(),
        view: alertView,
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
      },
    ],
    depthStencilAttachment,
  });

  // --- Draw sky
  renderPass.setPipeline(skyPipeline);
  renderPass.setBindGroup(0, skyBindGroup);
  // renderPass.setBindGroup(1, shaderBindGroup);
  renderPass.draw(6, 1, 0, 0);

  renderPass.setPipeline(shaderPipeline);
  renderPass.setBindGroup(0, vertexBindGroup);

  let modelDrawn = 0;

  // --- Draw triangles
  renderPass.setVertexBuffer(0, triangle.bufferData);
  renderPass.setBindGroup(1, shaderBindGroup);
  renderPass.draw(3, scene.triangleObjects.length, 0, modelDrawn);
  modelDrawn += scene.triangleObjects.length;

  // --- Draw floor
  renderPass.setVertexBuffer(0, quad.bufferData);
  renderPass.setBindGroup(1, shaderBindGroup);
  renderPass.draw(6, scene.tileObjects.length, 0, modelDrawn);
  modelDrawn += scene.tileObjects.length;

  // --- Draw 3d model
  renderPass.setVertexBuffer(0, objmesh.bufferData);
  renderPass.setBindGroup(1, shaderBindGroup);
  renderPass.draw(objmesh.vertexCount, 1, 0, modelDrawn);
  modelDrawn += 1;

  renderPass.end();
}

/**
 * @param {GPUCommandEncoder} encoder
 */
function applyAlertHUD(encoder) {
  const currentTime = performance.now();
  const elapsedTime = (currentTime - startTime) / 1000;

  device.queue.writeBuffer(timeBuffer, 0, new Float32Array([elapsedTime]));

  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
      },
    ],
  });

  renderPass.setPipeline(alertPipeline);
  renderPass.setBindGroup(0, alertBindGroup);
  renderPass.draw(6, 1, 0, 0);

  renderPass.setPipeline(hudPipeline);
  renderPass.setBindGroup(0, hudBindGroup);
  renderPass.draw(6, 1, 0, 0);

  renderPass.end();
}

/**
 *
 */
function render() {
  const encoder = device.createCommandEncoder();
  drawWorld(encoder);
  applyAlertHUD(encoder);

  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(render);
}

render();
