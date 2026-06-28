import { WebGPUWrapper } from "./library/core/WebGPUWrapper.js";
import { loadResources, parseObjCode, convertDegreeToRadian } from "./library/helper/utility.js";
import { resourceArray, vertexMap } from "./config.js";
import { FirstPersonCamera } from "./library/component/FirstPersonCamera.js";
import { Scene } from "./Scene.js";
import { mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

// --- WebGPU initialisation
const canvas = document.querySelector("canvas");
const webgpu = new WebGPUWrapper(canvas);
const { device, context, format } = await webgpu.init();

// --- Load all images/assets/models
const resources = await loadResources(resourceArray);

// --- Set up scene, camera, and all the objects in the scene
const scene = new Scene();
const camera = new FirstPersonCamera(canvas, { far: 100 });
camera.position = [-7, -0.5, 0.5];
camera.debugKeyPress = document.getElementById("event-keypress");
camera.debugMouseMove = document.getElementById("event-mousemove");

// --- Transformation
let statueTransform = mat4.identity();
statueTransform = mat4.multiply(statueTransform, mat4.scaling([0.15, 0.15, 0.15]));
let gunTransform = mat4.identity();
gunTransform = mat4.multiply(gunTransform, mat4.translation([0.8, -1.75, -1.5]));
gunTransform = mat4.multiply(gunTransform, mat4.scaling([0.25, 0.25, 0.25]));

// --- Set up all buffers
const { buffer: cameraBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 4 * 4 * 3) // 4-bytes * 3 types (forward, right, up)
  .setLabel("Camera buffer")
  .build();
const { buffer: uniformBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 4 * 4 * 4 * 2) // 4-bytes * 4x4 matrix * 2 types (projection, view)
  .setLabel("Uniform buffer")
  .build();
const { buffer: objectBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, 4 * 4 * 4 * 1024) // 4-bytes * 4x4 matrix * 2^10 (storage)
  .setLabel("Object buffer")
  .build();
const { buffer: timeBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 4) // 4-bytes
  .setLabel("Time buffer")
  .build();
const triangleMesh = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, vertexMap.triangle)
  .setLabel("Triangle mesh")
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();
const quadMesh = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, vertexMap.quad)
  .setLabel("Quad mesh")
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();
const statueMesh = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, parseObjCode(resources.statue, { preTransform: statueTransform }))
  .setLabel("Statue mesh")
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();
const gunMesh = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, parseObjCode(resources.gun, { useNormal: true, preTransform: gunTransform }))
  .setLabel("Gun mesh")
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .addVertexAttribute(3) // nx, ny, nz
  .build();

// --- Set up texture views and samplers (materials)
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
const { bindGroupLayout: fragmentBindGroupLayout, bindGroup: fragmentBindGroup } = imageBindGroupBuilder
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

const {
  view: weaponView,
  sampler: weaponSampler,
  bindGroupBuilder: weaponBindGroupBuilder,
} = await webgpu.createTextureViewSampler(null, {
  bindGroupLayout: alertBindGroupLayout,
  textureDescriptor: {
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  },
});
const { bindGroup: weaponBindGroup } = weaponBindGroupBuilder
  .setLabel("Weapon bind group", "Weapon bind group layout")
  .addBuffer(timeBuffer, GPUShaderStage.FRAGMENT, { type: "uniform" })
  .build();

const { view: hudView, sampler: hudSampler, bindGroupBuilder: hudBindGroupBuilder } = await webgpu.createTextureViewSampler([resources.hudImage]);
const { bindGroupLayout: hudBindGroupLayout, bindGroup: hudBindGroup } = hudBindGroupBuilder.setLabel("HUD bind group", "HUD bind group layout").build();

const {
  view: skinView,
  sampler: skinSampler,
  bindGroupBuilder: skinViewBindGroupBuilder,
} = await webgpu.createTextureViewSampler([resources.gunImage], {
  samplerDescriptor: {
    maxAnisotropy: 4,
    minFilter: "linear",
    mipmapFilter: "linear",
  },
});
const { bindGroupLayout: skinBindGroupLayout, bindGroup: skinBindGroup } = skinViewBindGroupBuilder
  .setLabel("Skin bind group", "Skin bind group layout")
  .build();

// --- Set up depth stencil
const { state: depthStencil, texture: depthStencilTexture, view: depthStencilView, attachment: depthStencilAttachment } = webgpu.setupDepthStencil();

// --- Set up remaining bind group layouts and bind groups
const { bindGroupLayout: vertexBindGroupLayout, bindGroup: vertexBindGroup } = webgpu
  .setupBindGroup()
  .setLabel("Vertex bind group", "Vertex bind group layout")
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX)
  .addBuffer(objectBuffer, GPUShaderStage.VERTEX, { type: "read-only-storage", hasDynamicOffset: false })
  .build();
const { bindGroupLayout: gunBindGroupLayout, bindGroup: gunBindGroup } = webgpu
  .setupBindGroup()
  .setLabel("Gun bind group", "Gun bind group layout")
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX, { type: "uniform" })
  .build();

// --- Set up pipeline layouts and pipelines
const { pipeline: skyPipeline } = webgpu
  .setupPipeline()
  .setLabel("Sky pipeline", "Sky pipeline layout")
  .addBindGroupLayout(skyBindGroupLayout)
  .addShaderCode("Sky shader module", resources.sky)
  .setVertexShader("Sky shader module", "vertexMain")
  .setFragmentShader("Sky shader module", "fragmentMain", {
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
  .setDepthStencil(depthStencil)
  .build();

const { pipeline: shaderPipeline } = webgpu
  .setupPipeline()
  .setLabel("Fragment pipeline", "Fragment pipeline layout")
  .addBindGroupLayout(vertexBindGroupLayout)
  .addBindGroupLayout(fragmentBindGroupLayout)
  .addShaderCode("Fragment shader code", resources.shader)
  .setVertexShader("Fragment shader code", "vertexMain", { buffers: [triangleMesh.bufferLayout] })
  .setFragmentShader("Fragment shader code", "fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .setDepthStencil(depthStencil)
  .build();

const { pipeline: alertPipeline } = webgpu
  .setupPipeline()
  .setLabel("Alert pipeline", "Alert pipeline layout")
  .addBindGroupLayout(alertBindGroupLayout)
  .addShaderCode("Alert shader module", resources.alert)
  .setVertexShader("Alert shader module", "vertexMain")
  .setFragmentShader("Alert shader module", "fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .build();

const { pipeline: hudPipeline } = webgpu
  .setupPipeline()
  .setLabel("HUD pipeline", "HUD pipeline layout")
  .addBindGroupLayout(hudBindGroupLayout)
  .addShaderCode("HUD shader module", resources.hud)
  .setVertexShader("HUD shader module", "vertexMain")
  .setFragmentShader("HUD shader module", "fragmentMain", {
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

const { pipeline: gunPipeline } = webgpu
  .setupPipeline()
  .setLabel("Gun pipeline", "Gun pipeline layout")
  .addBindGroupLayout(gunBindGroupLayout)
  .addBindGroupLayout(skinBindGroupLayout)
  .addShaderCode("Gun shader code", resources.weapon)
  .setVertexShader("Gun shader code", "vertexMain", { buffers: [gunMesh.bufferLayout] })
  .setDepthStencil(depthStencil)
  .setFragmentShader("Gun shader code", "fragmentMain", { targets: [{ format }] })
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
  renderPass.draw(6, 1, 0, 0);

  renderPass.setPipeline(shaderPipeline);
  renderPass.setBindGroup(0, vertexBindGroup);

  let modelDrawn = 0;

  // --- Draw triangles
  renderPass.setVertexBuffer(0, triangleMesh.buffer);
  renderPass.setBindGroup(1, fragmentBindGroup);
  renderPass.draw(3, scene.triangleObjects.length, 0, modelDrawn);
  modelDrawn += scene.triangleObjects.length;

  // --- Draw floor
  renderPass.setVertexBuffer(0, quadMesh.buffer);
  renderPass.setBindGroup(1, fragmentBindGroup);
  renderPass.draw(6, scene.tileObjects.length, 0, modelDrawn);
  modelDrawn += scene.tileObjects.length;

  // --- Draw 3d model
  renderPass.setVertexBuffer(0, statueMesh.buffer);
  renderPass.setBindGroup(1, fragmentBindGroup);
  renderPass.draw(statueMesh.count, 1, 0, modelDrawn);
  modelDrawn += 1;

  renderPass.end();
}

/**
 * @param {GPUCommandEncoder} encoder
 */
function drawGun(encoder) {
  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: weaponView,
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
      },
    ],
    depthStencilAttachment,
  });

  renderPass.setPipeline(gunPipeline);
  renderPass.setVertexBuffer(0, gunMesh.buffer);
  renderPass.setBindGroup(0, gunBindGroup);
  renderPass.setBindGroup(1, skinBindGroup);
  renderPass.draw(gunMesh.count, 1, 0, 0);

  renderPass.end();
}

/**
 * @param {GPUCommandEncoder} encoder
 */
function drawScreen(encoder) {
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

  // Alert
  renderPass.setPipeline(alertPipeline);
  renderPass.setBindGroup(0, alertBindGroup);
  renderPass.draw(6, 1, 0, 0);

  // Gun
  renderPass.setPipeline(alertPipeline);
  renderPass.setBindGroup(0, weaponBindGroup);
  renderPass.draw(6, 1, 0, 0);

  // HUD
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
  drawGun(encoder);
  drawScreen(encoder);

  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(render);
}

render();
