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
   * @type {Object.<string, {maxWidth: number, maxHeight: number, entries: ImageBitmap[]}>}
   */
  bitmapData;

  /**
   * @type {Object.<string, {maxWidth: number, maxHeight: number, entries: {data: Uint8Array|Uint8ClampedArray, width: number, height: number}[]}>}
   */
  textureData;

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
    this.bitmapData = undefined;
    this.textureData = undefined;
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
   * @param {{group: string, data: string|Blob|ImageBitmap}[]} resources
   * @param {boolean} [enableMipmap]
   * @returns {WebGPUTexture}
   */
  loadBitmapData(resources, enableMipmap = false) {
    this.bitmapData = {};

    for (let i = 0; i < resources.length; i++) {
      const group = resources[i].group || "__default__";
      if (Array.isArray(this.bitmapData[group]?.entries)) {
        this.bitmapData[group].maxWidth = Math.max(this.bitmapData[group].maxWidth, resources[i].data.width);
        this.bitmapData[group].maxHeight = Math.max(this.bitmapData[group].maxHeight, resources[i].data.height);
        this.bitmapData[group].entries.push(resources[i].data);
      } else {
        this.bitmapData[group] = {
          maxWidth: resources[i].data.width,
          maxHeight: resources[i].data.height,
          entries: [resources[i].data],
        };
      }
    }

    const groups = Object.keys(this.bitmapData);
    let imgCount = groups.length;
    let mipCount = 1;
    if (enableMipmap) {
      if (
        !Object.values(this.bitmapData).every(
          (value, index, array) =>
            value.maxWidth === array[0].maxWidth && value.maxHeight === array[0].maxHeight && value.entries.length === array[0].entries.length,
        )
      ) {
        throw new Error("The bitmap data count and dimensions must be identical across all groups");
      }
      mipCount = this.bitmapData[groups[0]].entries.length;
    } else {
      imgCount = this.bitmapData[groups[0]].entries.length;
    }

    this.textureDescriptor.mipLevelCount = mipCount;
    this.textureDescriptor.size = {
      width: this.bitmapData[groups[0]].maxWidth,
      height: this.bitmapData[groups[0]].maxHeight,
      depthOrArrayLayers: imgCount,
    };
    this.textureViewDescriptor.arrayLayerCount = imgCount;
    this.textureViewDescriptor.dimension = imgCount > 1 ? "2d-array" : "2d";
    this.textureViewDescriptor.mipLevelCount = mipCount;

    return this;
  }

  /**
   * @param {{group: string, data: Uint8Array|Uint8ClampedArray, width: number, height: number}[]} resources
   * @param {boolean} [enableMipmap]
   * @returns {WebGPUTexture}
   */
  loadTextureData(resources, enableMipmap = false) {
    this.textureData = {};

    for (let i = 0; i < resources.length; i++) {
      const group = resources[i].group || "__default__";
      if (Array.isArray(this.textureData[group]?.entries)) {
        this.textureData[group].maxWidth = Math.max(this.textureData[group].maxWidth, resources[i].width);
        this.textureData[group].maxHeight = Math.max(this.textureData[group].maxHeight, resources[i].height);
        this.textureData[group].entries.push({ data: resources[i].data, width: resources[i].width, height: resources[i].height });
      } else {
        this.textureData[group] = {
          maxWidth: resources[i].width,
          maxHeight: resources[i].height,
          entries: [{ data: resources[i].data, width: resources[i].width, height: resources[i].height }],
        };
      }
    }

    const groups = Object.keys(this.textureData);
    let imgCount = groups.length;
    let mipCount = 1;
    if (enableMipmap) {
      if (
        !Object.values(this.textureData).every(
          (value, index, array) =>
            value.maxWidth === array[0].maxWidth && value.maxHeight === array[0].maxHeight && value.entries.length === array[0].entries.length,
        )
      ) {
        throw new Error("The texture data count and dimensions must be identical across all groups");
      }
      mipCount = this.textureData[groups[0]].entries.length;
    } else {
      imgCount = this.textureData[groups[0]].entries.length;
    }

    this.textureDescriptor.mipLevelCount = mipCount;
    this.textureDescriptor.size = {
      width: this.textureData[groups[0]].maxWidth,
      height: this.textureData[groups[0]].maxHeight,
      depthOrArrayLayers: imgCount,
    };
    this.textureViewDescriptor.arrayLayerCount = imgCount;
    this.textureViewDescriptor.dimension = imgCount > 1 ? "2d-array" : "2d";
    this.textureViewDescriptor.mipLevelCount = mipCount;

    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/createView|GPUTexture: createView() method}
   * @param {GPUTextureViewDescriptor} [textureViewDescriptor]
   * @returns {WebGPUTexture}
   */
  createView(textureViewDescriptor = {}) {
    /** @type {GPUTextureViewDescriptor} */
    const finalTextureViewDescriptor = { ...this.textureViewDescriptor, ...textureViewDescriptor };
    this.webgpu.debug && console.debug("GPUTextureViewDescriptor", finalTextureViewDescriptor);
    this.textureView = this.texture.createView(finalTextureViewDescriptor);
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createSampler|GPUDevice: createSampler() method}
   * @param {GPUSamplerDescriptor} [samplerDescriptor]
   * @returns {WebGPUTexture}
   */
  createSampler(samplerDescriptor = {}) {
    /** @type {GPUSamplerDescriptor} */
    const finalSamplerDescriptor = { ...this.samplerDescriptor, ...samplerDescriptor };
    this.webgpu.debug && console.debug("GPUSamplerDescriptor", finalSamplerDescriptor);
    this.sampler = this.webgpu.device.createSampler(finalSamplerDescriptor);
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture|GPUDevice: createTexture() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/copyExternalImageToTexture|GPUQueue: copyExternalImageToTexture() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/writeTexture|GPUQueue: writeTexture() method}
   * @param {Object} [options]
   * @param {boolean} [options.createView]
   * @param {boolean} [options.createSampler]
   * @param {GPUTextureDescriptor} [options.overrideTextureDescriptor]
   * @param {GPUTextureViewDescriptor} [options.overrideTextureViewDescriptor]
   * @param {GPUSamplerDescriptor} [options.overrideSamplerDescriptor]
   * @returns {WebGPUTexture}
   */
  build(options = {}) {
    const {
      createView = true,
      createSampler = true,
      overrideTextureDescriptor = {},
      overrideTextureViewDescriptor = {},
      overrideSamplerDescriptor = {},
    } = options;

    /** @type {GPUTextureDescriptor} */
    const finalTextureDescriptor = { ...this.textureDescriptor, ...overrideTextureDescriptor };
    this.webgpu.debug && console.debug("GPUTextureDescriptor", finalTextureDescriptor);
    if (this.texture instanceof GPUTexture) {
      this.texture.destroy();
    }
    this.texture = this.webgpu.device.createTexture(finalTextureDescriptor);

    if (this.bitmapData) {
      Object.entries(this.bitmapData).forEach(([group, member], groupIndex) => {
        member.entries.forEach((bitmap, entryIndex) => {
          const mIndex = finalTextureDescriptor.mipLevelCount > 1 ? entryIndex : 0;
          const zIndex = finalTextureDescriptor.mipLevelCount > 1 ? groupIndex : entryIndex;
          this.webgpu.device.queue.copyExternalImageToTexture(
            { source: bitmap },
            { texture: this.texture, mipLevel: mIndex, origin: { x: 0, y: 0, z: zIndex } },
            { width: bitmap.width, height: bitmap.height },
          );
        });
      });
    }

    if (this.textureData) {
      Object.entries(this.textureData).forEach(([group, member], groupIndex) => {
        member.entries.forEach((texture, entryIndex) => {
          this.webgpu.device.queue.writeTexture(
            { texture: this.texture, mipLevel: entryIndex },
            texture.data,
            { bytesPerRow: texture.width * Float32Array.BYTES_PER_ELEMENT },
            { width: texture.width, height: texture.height },
          );
        });
      });
    }

    if (createView) {
      this.createView(overrideTextureViewDescriptor);
    }
    if (createSampler) {
      this.createSampler(overrideSamplerDescriptor);
    }

    return this;
  }
}
