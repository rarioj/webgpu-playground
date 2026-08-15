/**
 * @classdesc
 */
export class WebGPUTexture {
  /**
   * @type {boolean}
   */
  debug;

  /**
   * @type {GPUDevice}
   */
  device;

  /**
   * @type {GPUTextureDescriptor}
   */
  textureDescriptor;

  /**
   * @type {GPUTextureViewDescriptor}
   */
  textureViewDescriptor;

  /**
   * @type {Object.<string, {maxWidth: number, maxHeight: number, entries: ImageBitmap[]}>}
   */
  bitmaps;

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
   * @param {GPUDevice} device
   * @param {string} [label]
   */
  constructor(device, label = "Unlabelled") {
    this.debug = false;
    this.device = device;
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
    this.bitmaps = {};
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
   * @param {import('../utilities/assets.js').AssetResource[]} images
   * @returns {WebGPUTexture}
   */
  loadBitmaps(images) {
    for (let i = 0; i < images.length; i++) {
      const group = images[i].group;
      const bitmap = images[i].data;
      if (Array.isArray(this.bitmaps[group]?.entries)) {
        this.bitmaps[group].maxWidth = Math.max(this.bitmaps[group].maxWidth, bitmap.width);
        this.bitmaps[group].maxHeight = Math.max(this.bitmaps[group].maxHeight, bitmap.height);
        this.bitmaps[group].entries.push(bitmap);
      } else {
        this.bitmaps[group] = {
          maxWidth: bitmap.width,
          maxHeight: bitmap.height,
          entries: [bitmap],
        };
      }
    }
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createSampler|GPUDevice: createSampler() method}
   * @param {GPUSamplerDescriptor} [samplerDescriptor]
   * @returns {GPUSampler}
   */
  createSampler(samplerDescriptor = {}) {
    const defaultSamplerDescriptor = {
      addressModeU: "repeat",
      addressModeV: "repeat",
      addressModeW: "repeat",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    };

    /** @type {GPUSamplerDescriptor} */
    const finalSamplerDescriptor = { ...defaultSamplerDescriptor, ...samplerDescriptor };
    this.debug && console.debug("GPUSamplerDescriptor", finalSamplerDescriptor);

    return this.device.createSampler(finalSamplerDescriptor);
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture|GPUDevice: createTexture() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/copyExternalImageToTexture|GPUQueue: copyExternalImageToTexture() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/createView|GPUTexture: createView() method}
   * @param {Object} [options]
   * @param {boolean} [options.enableMipmap]
   * @param {boolean} [options.createSampler]
   * @param {GPUTextureDescriptor} [options.overrideTextureDescriptor]
   * @param {GPUTextureViewDescriptor} [options.overrideTextureViewDescriptor]
   * @param {GPUSamplerDescriptor} [options.overrideSamplerDescriptor]
   * @returns {{builder: WebGPUTexture, texture: GPUTexture, textureView: GPUTextureView, sampler?: GPUSampler}}
   */
  build(options = {}) {
    const {
      enableMipmap = false,
      createSampler = true,
      overrideTextureDescriptor = {},
      overrideTextureViewDescriptor = {},
      overrideSamplerDescriptor = {},
    } = options;

    /** @type {GPUTextureDescriptor} */
    const adjustTextureDescriptor = {};

    /** @type {GPUTextureViewDescriptor} */
    const adjustTextureViewDescriptor = {};

    const groups = Object.keys(this.bitmaps);
    let imgCount = groups.length;
    let mipCount = 1;
    if (imgCount) {
      if (enableMipmap) {
        if (
          !Object.values(this.bitmaps).every(
            (value, index, array) =>
              value.maxWidth === array[0].maxWidth && value.maxHeight === array[0].maxHeight && value.entries.length === array[0].entries.length,
          )
        ) {
          throw new Error("The image count and dimensions must be identical across all groups");
        }
        mipCount = this.bitmaps[groups[0]].entries.length;
      } else {
        imgCount = this.bitmaps[groups[0]].entries.length;
      }

      adjustTextureDescriptor.mipLevelCount = mipCount;
      adjustTextureDescriptor.size = {
        width: this.bitmaps[groups[0]].maxWidth,
        height: this.bitmaps[groups[0]].maxHeight,
        depthOrArrayLayers: imgCount,
      };

      adjustTextureViewDescriptor.arrayLayerCount = imgCount;
      adjustTextureViewDescriptor.dimension = imgCount > 1 ? "2d-array" : "2d";
      adjustTextureViewDescriptor.mipLevelCount = mipCount;
    }

    /** @type {GPUTextureDescriptor} */
    const finalTextureDescriptor = { ...this.textureDescriptor, ...adjustTextureDescriptor, ...overrideTextureDescriptor };
    this.debug && console.debug("GPUTextureDescriptor", finalTextureDescriptor);
    if (this.texture instanceof GPUTexture) {
      this.texture.destroy();
    }
    this.texture = this.device.createTexture(finalTextureDescriptor);

    if (imgCount) {
      Object.entries(this.bitmaps).forEach(([group, data], groupIndex) => {
        data.entries.forEach((image, entryIndex) => {
          const mIndex = enableMipmap ? entryIndex : 0;
          const zIndex = enableMipmap ? groupIndex : entryIndex;
          this.device.queue.copyExternalImageToTexture(
            { source: image },
            { texture: this.texture, mipLevel: mIndex, origin: { x: 0, y: 0, z: zIndex } },
            { width: image.width, height: image.height },
          );
        });
      });
    }

    /** @type {GPUTextureViewDescriptor} */
    const finalTextureViewDescriptor = { ...this.textureViewDescriptor, ...adjustTextureViewDescriptor, ...overrideTextureViewDescriptor };
    this.debug && console.debug("GPUTextureViewDescriptor", finalTextureViewDescriptor);
    this.textureView = this.texture.createView(finalTextureViewDescriptor);

    if (createSampler) {
      this.sampler = this.createSampler(overrideSamplerDescriptor);
      return { builder: this, texture: this.texture, textureView: this.textureView, sampler: this.sampler };
    }
    return { builder: this, texture: this.texture, textureView: this.textureView };
  }
}
