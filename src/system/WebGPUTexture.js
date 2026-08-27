import { WebGPU } from "./WebGPU.js";

/**
 * @classdesc
 */
export class WebGPUTexture {
  /**
   * @type {WebGPU}
   */
  webgpu;

  /**
   * @type {GPUTextureDescriptor}
   */
  textureDescriptor;

  /**
   * @type {GPUTextureViewDescriptor}
   */
  textureViewDescriptor;

  /**
   * @type {GPUSamplerDescriptor}
   */
  samplerDescriptor;

  /**
   * @type {Object.<string, {maxWidth: number, maxHeight: number, entries: (ImageBitmap|HTMLCanvasElement|HTMLVideoElement)[]}>}
   */
  imageTextureData;

  /**
   * @type {Object.<string, {maxWidth: number, maxHeight: number, entries: {data: Uint8Array|Uint8ClampedArray, width: number, height: number}[]}>}
   */
  arrayTextureData;

  /**
   * @type {GPUTexture}
   */
  texture;

  /**
   * @type {GPUTextureView}
   */
  textureView;

  /**
   * @type {GPUSampler}
   */
  sampler;

  /**
   * @param {WebGPU} webgpu
   * @param {string} [label]
   */
  constructor(webgpu, label = "Unlabelled") {
    this.webgpu = webgpu;
    this.textureDescriptor = {
      label: `${label} (GPUTexture)`,
      format: "bgra8unorm",
      size: {
        width: 0,
        height: 0,
        depthOrArrayLayers: 1,
      },
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    };
    this.textureViewDescriptor = {
      label: `${label} (GPUTextureView)`,
    };
    this.samplerDescriptor = {
      label: `${label} (GPUSampler)`,
      addressModeU: "repeat",
      addressModeV: "repeat",
      addressModeW: "repeat",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    };
    this.imageTextureData = undefined;
    this.arrayTextureData = undefined;
    this.texture = undefined;
    this.textureView = undefined;
    this.sampler = undefined;
  }

  /**
   * @param {GPUTextureFormat} textureFormat
   * @returns {WebGPUTexture}
   */
  setTextureFormat(textureFormat) {
    this.textureDescriptor.format = textureFormat;
    return this;
  }

  /**
   * @param {number} width
   * @param {number} height
   * @param {number} [depthOrArrayLayers]
   * @returns {WebGPUTexture}
   */
  setTextureSize(width, height, depthOrArrayLayers = 1) {
    this.textureDescriptor.size.width = width;
    this.textureDescriptor.size.height = height;
    this.textureDescriptor.size.depthOrArrayLayers = depthOrArrayLayers;
    return this;
  }

  /**
   * @param {GPUTextureUsageFlags} textureUsageFlags
   * @returns {WebGPUTexture}
   */
  setTextureUsage(textureUsageFlags) {
    this.textureDescriptor.usage = textureUsageFlags;
    return this;
  }

  /**
   * @param {{group: string, data: ImageBitmap|HTMLCanvasElement|HTMLVideoElement}[]} resources
   * @param {Object} [options]
   * @param {boolean} [options.enableMips]
   * @returns {WebGPUTexture}
   */
  loadImageTexture(resources, options = {}) {
    const { enableMips = false } = options;

    this.imageTextureData = {};

    for (let i = 0; i < resources.length; i++) {
      const group = resources[i].group || "__default__";
      const width = resources[i].data instanceof HTMLVideoElement ? resources[i].data.videoWidth : resources[i].data.width;
      const height = resources[i].data instanceof HTMLVideoElement ? resources[i].data.videoHeight : resources[i].data.height;
      if (Array.isArray(this.imageTextureData[group]?.entries)) {
        this.imageTextureData[group].maxWidth = Math.max(this.imageTextureData[group].maxWidth, width);
        this.imageTextureData[group].maxHeight = Math.max(this.imageTextureData[group].maxHeight, height);
        this.imageTextureData[group].entries.push(resources[i].data);
      } else {
        this.imageTextureData[group] = {
          maxWidth: width,
          maxHeight: height,
          entries: [resources[i].data],
        };
      }
    }

    const groups = Object.keys(this.imageTextureData);
    let imgCount = groups.length;
    let mipCount = 1;
    if (enableMips) {
      if (
        !Object.values(this.imageTextureData).every(
          (value, index, array) =>
            value.maxWidth === array[0].maxWidth && value.maxHeight === array[0].maxHeight && value.entries.length === array[0].entries.length,
        )
      ) {
        throw new Error("The bitmap data count and dimensions must be identical across all groups");
      }
      mipCount = this.imageTextureData[groups[0]].entries.length;
    } else {
      imgCount = this.imageTextureData[groups[0]].entries.length;
    }

    if (mipCount === 1 && enableMips) {
      const firstBitmap = this.imageTextureData[groups[0]];
      const maxSize = Math.max(firstBitmap.maxWidth, firstBitmap.maxHeight);
      mipCount = (1 + Math.log2(maxSize)) | 0;
    }

    this.textureDescriptor.mipLevelCount = mipCount;
    this.textureDescriptor.size = {
      width: this.imageTextureData[groups[0]].maxWidth,
      height: this.imageTextureData[groups[0]].maxHeight,
      depthOrArrayLayers: imgCount,
    };
    this.textureViewDescriptor.arrayLayerCount = imgCount;
    this.textureViewDescriptor.dimension = imgCount > 1 ? "2d-array" : "2d";
    this.textureViewDescriptor.mipLevelCount = mipCount;

    return this;
  }

  /**
   * @param {{group: string, data: Uint8Array|Uint8ClampedArray, width: number, height: number}[]} resources
   * @param {Object} [options]
   * @param {boolean} [options.enableMips]
   * @returns {WebGPUTexture}
   */
  loadArrayTexture(resources, options = {}) {
    const { enableMips = false } = options;

    this.arrayTextureData = {};

    if (resources.length === 1 && enableMips) {
      resources = this.generateArrayTextureMips(resources[0]);
    }

    for (let i = 0; i < resources.length; i++) {
      const group = resources[i].group || "__default__";
      if (Array.isArray(this.arrayTextureData[group]?.entries)) {
        this.arrayTextureData[group].maxWidth = Math.max(this.arrayTextureData[group].maxWidth, resources[i].width);
        this.arrayTextureData[group].maxHeight = Math.max(this.arrayTextureData[group].maxHeight, resources[i].height);
        this.arrayTextureData[group].entries.push({ data: resources[i].data, width: resources[i].width, height: resources[i].height });
      } else {
        this.arrayTextureData[group] = {
          maxWidth: resources[i].width,
          maxHeight: resources[i].height,
          entries: [{ data: resources[i].data, width: resources[i].width, height: resources[i].height }],
        };
      }
    }

    const groups = Object.keys(this.arrayTextureData);
    let imgCount = groups.length;
    let mipCount = 1;
    if (enableMips) {
      if (
        !Object.values(this.arrayTextureData).every(
          (value, index, array) =>
            value.maxWidth === array[0].maxWidth && value.maxHeight === array[0].maxHeight && value.entries.length === array[0].entries.length,
        )
      ) {
        throw new Error("The texture data count and dimensions must be identical across all groups");
      }
      mipCount = this.arrayTextureData[groups[0]].entries.length;
    } else {
      imgCount = this.arrayTextureData[groups[0]].entries.length;
    }

    this.textureDescriptor.mipLevelCount = mipCount;
    this.textureDescriptor.size = {
      width: this.arrayTextureData[groups[0]].maxWidth,
      height: this.arrayTextureData[groups[0]].maxHeight,
      depthOrArrayLayers: imgCount,
    };
    this.textureViewDescriptor.arrayLayerCount = imgCount;
    this.textureViewDescriptor.dimension = imgCount > 1 ? "2d-array" : "2d";
    this.textureViewDescriptor.mipLevelCount = mipCount;

    return this;
  }

  /**
   *
   * @param {number} [baseArrayLayer]
   */
  generateImageTextureMips(baseArrayLayer = 0) {
    const shaderCode = `struct d{@builtin(position) position:vec4<f32>,@location(0) texcoord:vec2<f32>}@group(0) @binding(0) var e:texture_2d<f32>;@group(0) @binding(1) var f:sampler;@vertex fn vMain(@builtin(vertex_index) a:u32)->d{var b:array<vec2<f32>,6> =array<vec2<f32>,6>(vec2<f32>(0.0,0.0),vec2<f32>(1.0,0.0),vec2<f32>(0.0,1.0),vec2<f32>(0.0,1.0),vec2<f32>(1.0,0.0),vec2<f32>(1.0,1.0));var c:d;c.position=vec4<f32>(b[a]*2.0-1.0,0.0,1.0);c.texcoord=vec2<f32>(b[a].x,1.0-b[a].y);return c;}@fragment fn fMain(g:d)->@location(0) vec4<f32> {return textureSample(e,f,g.texcoord);}`;

    const { pipeline } = this.webgpu
      .setupPipeline()
      .setLayout("auto")
      .useShaderCode(shaderCode)
      .setVertexShader()
      .setFragmentShader({ targets: [{ format: this.texture.format }] })
      .build();

    const encoder = this.webgpu.setupEncoder();
    for (let i = 1; i < this.texture.mipLevelCount; i++) {
      const { bindGroup } = this.webgpu
        .setupBindGroup()
        .setLayout(pipeline.getBindGroupLayout(0))
        .addTexture(this.texture.createView({ dimension: "2d", baseArrayLayer, arrayLayerCount: 1, baseMipLevel: i - 1, mipLevelCount: 1 }))
        .addSampler(this.sampler)
        .build();

      encoder
        .beginRenderPass({
          colorAttachments: [
            {
              view: this.texture.createView({ dimension: "2d", baseArrayLayer, arrayLayerCount: 1, baseMipLevel: i, mipLevelCount: 1 }),
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        })
        .setPipeline(pipeline)
        .setBindGroup(0, bindGroup)
        .draw(6)
        .end();
    }
    encoder.submitCommandBuffer();
  }

  /**
   * @param {{group: string, data: Uint8Array|Uint8ClampedArray, width: number, height: number}} object
   * @returns {{group: string, data: Uint8Array|Uint8ClampedArray, width: number, height: number}[]}
   */
  generateArrayTextureMips({ group = "__default__", data, width, height }) {
    const mipmaps = [];
    let mipmap = { group, data, width, height };
    mipmaps.push(mipmap);

    while (mipmap.width > 1 || mipmap.height > 1) {
      const { data, width, height } = mipmap;
      const dstWidth = Math.max(1, (width / 2) | 0);
      const dstHeight = Math.max(1, (height / 2) | 0);
      const dst = new Uint8Array(dstWidth * dstHeight * 4);
      const scaleX = width / dstWidth;
      const scaleY = height / dstHeight;
      for (let y = 0; y < dstHeight; ++y) {
        const av = (y + 0.5) * scaleY - 0.5;
        const ty = Math.max(0, Math.min(height - 2, av | 0));
        const t2 = av - ty;
        const rowTop = ty * width * 4;
        const rowBot = rowTop + width * 4;
        const dstRowOffset = y * dstWidth * 4;
        for (let x = 0; x < dstWidth; ++x) {
          const au = (x + 0.5) * scaleX - 0.5;
          const tx = Math.max(0, Math.min(width - 2, au | 0));
          const t1 = au - tx;
          const idxTL = rowTop + tx * 4;
          const idxBL = rowBot + tx * 4;
          const dstIdx = dstRowOffset + x * 4;
          for (let c = 0; c < 4; ++c) {
            const tl = data[idxTL + c];
            const tr = data[idxTL + 4 + c];
            const bl = data[idxBL + c];
            const br = data[idxBL + 4 + c];
            const top = tl + (tr - tl) * t1;
            const bot = bl + (br - bl) * t1;
            dst[dstIdx + c] = top + (bot - top) * t2;
          }
        }
      }
      mipmap = { group, data: dst, width: dstWidth, height: dstHeight };
      mipmaps.push(mipmap);
    }

    return mipmaps;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture|GPUDevice: createTexture() method}
   * @param {GPUTextureDescriptor} [textureDescriptor]
   * @returns {WebGPUTexture}
   */
  createTexture(textureDescriptor = {}) {
    this.textureDescriptor = { ...this.textureDescriptor, ...textureDescriptor };
    this.webgpu.debug && console.debug("GPUTextureDescriptor", this.textureDescriptor);
    if (this.texture instanceof GPUTexture) {
      this.texture.destroy();
    }
    this.texture = this.webgpu.device.createTexture(this.textureDescriptor);
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/createView|GPUTexture: createView() method}
   * @param {GPUTextureViewDescriptor} [textureViewDescriptor]
   * @returns {WebGPUTexture}
   */
  createView(textureViewDescriptor = {}) {
    this.textureViewDescriptor = { ...this.textureViewDescriptor, ...textureViewDescriptor };
    this.webgpu.debug && console.debug("GPUTextureViewDescriptor", this.textureViewDescriptor);
    this.textureView = this.texture.createView(this.textureViewDescriptor);
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createSampler|GPUDevice: createSampler() method}
   * @param {GPUSamplerDescriptor} [samplerDescriptor]
   * @returns {WebGPUTexture}
   */
  createSampler(samplerDescriptor = {}) {
    this.samplerDescriptor = { ...this.samplerDescriptor, ...samplerDescriptor };
    this.webgpu.debug && console.debug("GPUSamplerDescriptor", this.samplerDescriptor);
    this.sampler = this.webgpu.device.createSampler(this.samplerDescriptor);
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/copyExternalImageToTexture|GPUQueue: copyExternalImageToTexture() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/writeTexture|GPUQueue: writeTexture() method}
   * @param {Object} [options]
   * @param {boolean} [options.createTexture]
   * @param {boolean} [options.createView]
   * @param {boolean} [options.createSampler]
   * @param {GPUTextureDescriptor} [options.overrideTextureDescriptor]
   * @param {GPUTextureViewDescriptor} [options.overrideTextureViewDescriptor]
   * @param {GPUSamplerDescriptor} [options.overrideSamplerDescriptor]
   * @returns {WebGPUTexture}
   */
  build(options = {}) {
    const {
      createTexture = true,
      createView = true,
      createSampler = true,
      overrideTextureDescriptor = {},
      overrideTextureViewDescriptor = {},
      overrideSamplerDescriptor = {},
    } = options;

    if (createTexture) {
      this.createTexture(overrideTextureDescriptor);
    }

    if (createSampler) {
      this.createSampler(overrideSamplerDescriptor);
    }

    if (this.imageTextureData) {
      Object.entries(this.imageTextureData).forEach(([group, member], groupIndex) => {
        member.entries.forEach((iTexture, entryIndex) => {
          const mIndex = this.textureDescriptor.mipLevelCount > 1 ? entryIndex : 0;
          const zIndex = this.textureDescriptor.mipLevelCount > 1 ? groupIndex : entryIndex;
          const width = iTexture instanceof HTMLVideoElement ? iTexture.videoWidth : iTexture.width;
          const height = iTexture instanceof HTMLVideoElement ? iTexture.videoHeight : iTexture.height;
          this.webgpu.device.queue.copyExternalImageToTexture(
            { source: iTexture },
            { texture: this.texture, mipLevel: mIndex, origin: { x: 0, y: 0, z: zIndex } },
            { width: width, height: height },
          );
        });
        if (member.entries.length === 1 && this.textureDescriptor.mipLevelCount > 1) {
          if (!this.sampler) {
            this.createSampler(overrideSamplerDescriptor);
          }
          this.generateImageTextureMips(groupIndex);
        }
      });
    }

    if (this.arrayTextureData) {
      Object.entries(this.arrayTextureData).forEach(([group, member], groupIndex) => {
        member.entries.forEach((aTexture, entryIndex) => {
          this.webgpu.device.queue.writeTexture(
            { texture: this.texture, mipLevel: entryIndex },
            aTexture.data,
            { bytesPerRow: aTexture.width * Float32Array.BYTES_PER_ELEMENT },
            { width: aTexture.width, height: aTexture.height },
          );
        });
      });
    }

    if (createView) {
      this.createView(overrideTextureViewDescriptor);
    }

    return this;
  }
}
