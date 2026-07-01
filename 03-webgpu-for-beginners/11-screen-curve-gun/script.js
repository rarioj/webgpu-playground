import { WebGPUWrapper } from "./library/core/WebGPUWrapper.js";
import { loadResources, parseObjCode } from "./library/helper/utility.js";
import { config } from "./config.js";
import { Scene } from "./Scene.js";
import { FirstPersonCamera } from "./library/component/FirstPersonCamera.js";

/*
 * Initialisation
 * ==============
 */

// WebGPU initialisation
const canvas = document.querySelector("canvas");
const webgpu = new WebGPUWrapper(canvas);
const { device, context, format } = await webgpu.init();

// Fetch all resources
const resources = await loadResources(config.resources);

// Set up scene and camera
const scene = new Scene();
const camera = new FirstPersonCamera(canvas, { far: 100 });
camera.setPosition(-7, -0.5, 0.5);

/*
 * Buffers
 * =======
 */

// Set up various buffers
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
const { buffer: triangleMeshBuffer, bufferLayout: triangleMeshBufferLayout } = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, config.vertices.triangle)
  .setLabel("Triangle mesh")
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();
const { buffer: quadMeshBuffer } = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, config.vertices.quad)
  .setLabel("Quad mesh")
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();
const { buffer: statueMeshBuffer, vertexCount: statueMeshVertexCount } = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, parseObjCode(resources.statueObj, { preTransform: config.transform.statue() }))
  .setLabel("Statue mesh")
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .build();
const {
  buffer: gunMeshBuffer,
  bufferLayout: gunMeshBufferLayout,
  vertexCount: gunMeshVertexCount,
} = webgpu
  .setupBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, parseObjCode(resources.gunObj, { useNormal: true, preTransform: config.transform.gun() }))
  .setLabel("Gun mesh")
  .addVertexAttribute(3) // x, y, z
  .addVertexAttribute(2) // u, v
  .addVertexAttribute(3) // nx, ny, nz
  .build();

/*
 * Bind groups
 * ===========
 */

// Set up texture views and samplers, assign them to their bind groups + layouts
//// Sky (cubemap)
const { bindGroupBuilder: skyBindGroupBuilder } = await webgpu.createTextureViewSampler(resources.skyImages, {
  textureViewDescriptor: { dimension: "cube" },
});
const { bindGroupLayout: skyBindGroupLayout, bindGroup: skyBindGroup } = skyBindGroupBuilder
  .setLabel("Sky texture bind group", "Sky texture bind group layout")
  .addBuffer(cameraBuffer, GPUShaderStage.VERTEX, { type: "uniform" })
  .build();
//// Asset images
const { bindGroupBuilder: assetBindGroupBuilder } = await webgpu.createTextureViewSampler(resources.assetImages, {
  enableMipmap: true,
  samplerDescriptor: {
    maxAnisotropy: 4,
    minFilter: "linear",
    mipmapFilter: "linear",
  },
});
const { bindGroupLayout: assetBindGroupLayout, bindGroup: assetBindGroup } = assetBindGroupBuilder
  .setLabel("Assets texture bind group", "Assets texture bind group layout")
  .build();
//// Alert (canvas)
const { view: alertView, bindGroupBuilder: alertBindGroupBuilder } = await webgpu.createTextureViewSampler(null, {
  textureDescriptor: {
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  },
});
const { bindGroupLayout: alertBindGroupLayout, bindGroup: alertBindGroup } = alertBindGroupBuilder
  .setLabel("Alert canvas bind group", "Alert canvas bind group layout")
  .addBuffer(timeBuffer, GPUShaderStage.FRAGMENT, { type: "uniform" })
  .build();
//// HUD image
const { bindGroupBuilder: hudBindGroupBuilder } = await webgpu.createTextureViewSampler([resources.hudImage]);
const { bindGroupLayout: hudBindGroupLayout, bindGroup: hudBindGroup } = hudBindGroupBuilder
  .setLabel("HUD texture bind group", "HUD texture bind group layout")
  .build();
//// Weapon (canvas) - same bind group layout as Alert (canvas)
const { view: weaponView, bindGroupBuilder: weaponBindGroupBuilder } = await webgpu.createTextureViewSampler(null, {
  bindGroupLayout: alertBindGroupLayout,
  textureDescriptor: {
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  },
});
const { bindGroup: weaponBindGroup } = weaponBindGroupBuilder
  .setLabel("Weapon canvas bind group", "Weapon canvas bind group layout")
  .addBuffer(timeBuffer, GPUShaderStage.FRAGMENT, { type: "uniform" })
  .build();
//// Gun skin image
const { bindGroupBuilder: skinBindGroupBuilder } = await webgpu.createTextureViewSampler([resources.gunImage], {
  samplerDescriptor: {
    maxAnisotropy: 4,
    minFilter: "linear",
    mipmapFilter: "linear",
  },
});
const { bindGroupLayout: skinBindGroupLayout, bindGroup: skinBindGroup } = skinBindGroupBuilder
  .setLabel("Skin texture bind group", "Skin texture bind group layout")
  .build();

// Set up the remaining bind groups and their layouts
//// Primary shader bind group
const { bindGroupLayout: shaderBindGroupLayout, bindGroup: shaderBindGroup } = webgpu
  .setupBindGroup()
  .setLabel("Shader bind group", "Shader bind group layout")
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX)
  .addBuffer(objectBuffer, GPUShaderStage.VERTEX, { type: "read-only-storage", hasDynamicOffset: false })
  .build();
//// Gun model bind group
const { bindGroupLayout: gunBindGroupLayout, bindGroup: gunBindGroup } = webgpu
  .setupBindGroup()
  .setLabel("Gun model bind group", "Gun model bind group layout")
  .addBuffer(uniformBuffer, GPUShaderStage.VERTEX, { type: "uniform" })
  .build();

/*
 * Pipelines
 * =========
 */

// Set up depth stencil
const { state: depthStencilState, attachment: depthStencilAttachment } = webgpu.setupDepthStencil();

// Set up pipelines and their layouts
//// Sky (cubemap)
const { pipeline: skyPipeline } = webgpu
  .setupPipeline()
  .setLabel("Sky pipeline", "Sky pipeline layout")
  .addBindGroupLayout(skyBindGroupLayout)
  .setShaderCode(resources.skyCode)
  .setVertexShader("vertexMain")
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .setDepthStencil(depthStencilState)
  .build();
//// Primary shader
const { pipeline: shaderPipeline } = webgpu
  .setupPipeline()
  .setLabel("Shader pipeline", "Shader pipeline layout")
  .addBindGroupLayout(shaderBindGroupLayout)
  .addBindGroupLayout(assetBindGroupLayout)
  .setShaderCode(resources.shaderCode)
  .setVertexShader("vertexMain", { buffers: [triangleMeshBufferLayout] })
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .setDepthStencil(depthStencilState)
  .build();
//// Alert
const { pipeline: alertPipeline } = webgpu
  .setupPipeline()
  .setLabel("Alert pipeline", "Alert pipeline layout")
  .addBindGroupLayout(alertBindGroupLayout)
  .setShaderCode(resources.alertCode)
  .setVertexShader("vertexMain")
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .build();
//// HUD
const { pipeline: hudPipeline } = webgpu
  .setupPipeline()
  .setLabel("HUD pipeline", "HUD pipeline layout")
  .addBindGroupLayout(hudBindGroupLayout)
  .setShaderCode(resources.hudCode)
  .setVertexShader("vertexMain")
  .setFragmentShader("fragmentMain", {
    targets: [
      {
        format,
        // enabling HUD transparency
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
//// Gun
const { pipeline: gunPipeline } = webgpu
  .setupPipeline()
  .setLabel("Gun pipeline", "Gun pipeline layout")
  .addBindGroupLayout(gunBindGroupLayout)
  .addBindGroupLayout(skinBindGroupLayout)
  .setShaderCode(resources.gunCode)
  .setVertexShader("vertexMain", { buffers: [gunMeshBufferLayout] })
  .setFragmentShader("fragmentMain", { targets: [{ format }] })
  .setPrimitive({ topology: "triangle-list" })
  .setDepthStencil(depthStencilState)
  .build();

/*
 * Renderer
 * ========
 */

const dy = Math.tan(Math.PI / 8);
const dx = (dy * canvas.width) / canvas.height;
const startTime = performance.now();

/**
 *
 */
function render() {
  scene.update();
  camera.update();

  const currentTime = performance.now();
  const elapsedTime = (currentTime - startTime) / 1000;

  const cameraData = new Float32Array([
    camera.forward[0],
    camera.forward[1],
    camera.forward[2],
    0.0, // padding
    dx * camera.right[0],
    dx * camera.right[1],
    dx * camera.right[2],
    0.0, // padding
    dy * camera.up[0],
    dy * camera.up[1],
    dy * camera.up[2],
    0.0, // padding
  ]);

  webgpu
    .setupEncoder("Main command encoder")

    // Writing buffers
    .queueBuffer(objectBuffer, 0, scene.objectData, 0, scene.objectData.length)
    .queueBuffer(uniformBuffer, 0, camera.view)
    .queueBuffer(uniformBuffer, 64, camera.projection)
    .queueBuffer(cameraBuffer, 0, cameraData, 0, 12)
    .queueBuffer(timeBuffer, 0, new Float32Array([elapsedTime]))

    // Draw the worlds
    .beginRenderPass({
      colorAttachments: [
        {
          view: alertView,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
        },
      ],
      depthStencilAttachment,
    })
    //// Render the sky
    .setPipeline(skyPipeline)
    .setBindGroup(0, skyBindGroup)
    .draw(6, 1, 0, 0)
    //// Render the primary shader
    .setPipeline(shaderPipeline)
    .setBindGroup(0, shaderBindGroup)
    //// Render the triangles
    .setVertexBuffer(0, triangleMeshBuffer)
    .setBindGroup(1, assetBindGroup)
    .draw(3, scene.triangles.length, 0, 0)
    //// Render the tiles
    .setVertexBuffer(0, quadMeshBuffer)
    .setBindGroup(1, assetBindGroup)
    .draw(6, scene.tiles.length, 0, scene.triangles.length)
    //// Render the statue
    .setVertexBuffer(0, statueMeshBuffer)
    .setBindGroup(1, assetBindGroup)
    .draw(statueMeshVertexCount, 1, 0, scene.triangles.length + scene.tiles.length)
    .end()

    // Draw the gun
    .beginRenderPass({
      colorAttachments: [
        {
          view: weaponView,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
        },
      ],
      depthStencilAttachment,
    })
    //// Render the gun
    .setPipeline(gunPipeline)
    .setVertexBuffer(0, gunMeshBuffer)
    .setBindGroup(0, gunBindGroup)
    .setBindGroup(1, skinBindGroup)
    .draw(gunMeshVertexCount, 1, 0, 0)
    .end()

    // Draw the screen
    .beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
        },
      ],
    })
    //// Render the alert (canvas)
    .setPipeline(alertPipeline)
    .setBindGroup(0, alertBindGroup)
    .draw(6, 1, 0, 0)
    //// Render the weapon (canvas)
    .setPipeline(alertPipeline)
    .setBindGroup(0, weaponBindGroup)
    .draw(6, 1, 0, 0)
    //// Render the HUD
    .setPipeline(hudPipeline)
    .setBindGroup(0, hudBindGroup)
    .draw(6, 1, 0, 0)
    .end()

    // Submit the command buffer
    .submit();

  requestAnimationFrame(render);
}

render();
