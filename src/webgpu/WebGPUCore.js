import { WebGPUBufferBuilder } from "./WebGPUBufferBuilder.js";
import { WebGPUBindGroupBuilder } from "./WebGPUBindGroupBuilder.js";
import { WebGPUPipelineBuilder } from "./WebGPUPipelineBuilder.js";
import { WebGPUEncoderBuilder } from "./WebGPUEncoderBuilder.js";

/** @typedef {import("../helper/utilities.js").AssetBlobResult} AssetBlobResult */

/**
 * @classdesc
 */
export class WebGPUCore {
  /**
   * @type {string}
   */
  #DEBUG_STYLE = "background: #ff0000; color: #ffffff; padding: 5px 10px; font-weight: bold; border-radius: 5px;";

  /**
   * @type {HTMLCanvasElement|undefined}
   */
  canvas;

  /**
   * @type {boolean}
   */
  debug;

  /**
   * @type {boolean}
   */
  globalDebug;

  /**
   * @type {GPUAdapter}
   */
  adapter;

  /**
   * @type {GPUDevice}
   */
  device;

  /**
   * @type {GPUCanvasContext}
   */
  context;

  /**
   * @type {GPUTextureFormat|""}
   */
  format;

  /**
   * @param {HTMLCanvasElement} [canvas]
   */
  constructor(canvas = undefined) {
    this.canvas = canvas;
    this.debug = false;
    this.globalDebug = false;

    if (!navigator.gpu) {
      throw "WebGPU is not supported in this browser.";
    }
  }

  /**
   * @async
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPU/requestAdapter|GPU: requestAdapter() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUAdapter/requestDevice|GPUAdapter: requestDevice() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext/configure|GPUCanvasContext: configure() method}
   * @param {Object} [options]
   * @param {GPURequestAdapterOptions} [options.requestAdapterOptions]
   * @param {GPUDeviceDescriptor} [options.deviceDescriptor]
   * @param {GPUCanvasConfiguration} [options.canvasConfiguration]
   * @returns {{adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext|null, format: GPUTextureFormat|""}}
   */
  async init(options = {}) {
    const { requestAdapterOptions = {}, deviceDescriptor = {}, canvasConfiguration = {} } = options;

    this.init.deviceCounter = this.init.deviceCounter || 0;
    this.init.queueCounter = this.init.queueCounter || 0;

    /** @type {GPURequestAdapterOptions} */
    const defaultRequestAdapterOptions = {
      featureLevel: "core",
      forceFallbackAdapter: false,
      powerPreference: "high-performance",
    };

    /** @type {GPUDeviceDescriptor} */
    const defaultDeviceDescriptor = {
      label: `Device #${this.init.deviceCounter++}`,
      defaultQueue: { label: `Queue #${this.init.queueCounter++}` },
      requiredFeatures: ["core-features-and-limits"],
      requiredLimits: { maxBindGroups: 4 },
    };

    /** @type {GPUCanvasConfiguration} */
    const defaultCanvasConfiguration = {
      alphaMode: "opaque",
      colorSpace: "srgb",
      device: undefined,
      format: navigator.gpu.getPreferredCanvasFormat(),
      toneMapping: { mode: "standard" },
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      viewFormats: [],
    };

    if (this.globalDebug) {
      console.debug("%c WebGPUCore.init", this.#DEBUG_STYLE);
    }

    // Request adapter
    /** @type {GPURequestAdapterOptions} */
    const finalRequestAdapterOptions = { ...defaultRequestAdapterOptions, ...requestAdapterOptions };
    if (this.debug) {
      console.debug("GPURequestAdapterOptions", finalRequestAdapterOptions);
    }
    this.adapter = await navigator.gpu.requestAdapter(finalRequestAdapterOptions);
    if (!this.adapter) {
      throw "WebGPU appears to be disabled/inactive in this browser.";
    }

    // Request device
    /** @type {GPUDeviceDescriptor} */
    const finalDeviceDescriptor = { ...defaultDeviceDescriptor, ...deviceDescriptor };
    if (this.debug) {
      console.debug("GPUDeviceDescriptor", finalDeviceDescriptor);
    }
    this.device = await this.adapter.requestDevice(finalDeviceDescriptor);
    this.device.lost.then((info) => {
      console.error(`WebGPU device lost: ${info.message} [${info.reason}]`);
      this.device = undefined;
    });

    // Set up canvas context and canvas format
    this.context = this.canvas instanceof HTMLCanvasElement ? this.canvas.getContext("webgpu") : null;
    this.format = "";
    if (this.context instanceof GPUCanvasContext) {
      /** @type {GPUCanvasConfiguration} */
      const finalCanvasConfiguration = { ...defaultCanvasConfiguration, ...{ device: this.device }, ...canvasConfiguration };
      if (this.debug) {
        console.debug("GPUCanvasConfiguration", finalCanvasConfiguration);
      }
      this.context.configure(finalCanvasConfiguration);
      this.format = this.context.getConfiguration().format;
    }

    return { adapter: this.adapter, device: this.device, context: this.context, format: this.format };
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture|GPUDevice: createTexture() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/createView|GPUTexture: createView() method}
   * @param {Object} [options]
   * @param {GPUTextureDescriptor} [options.textureDescriptor]
   * @param {GPUTextureViewDescriptor} [options.textureViewDescriptor]
   * @returns {{texture: GPUTexture, view: GPUTextureView, state: GPUDepthStencilState, attachment: GPURenderPassDepthStencilAttachment}}
   */
  configureDepthStencil(options = {}) {
    const { textureDescriptor = {}, textureViewDescriptor = {} } = options;

    this.configureDepthStencil.textureCounter = this.configureDepthStencil.textureCounter || 0;
    this.configureDepthStencil.textureViewCounter = this.configureDepthStencil.textureViewCounter || 0;

    /** @type {GPUTextureDescriptor} */
    const defaultTextureDescriptor = {
      label: `Depth stencil texture #${this.configureDepthStencil.textureCounter++}`,
      dimension: "2d",
      format: "depth24plus-stencil8",
      mipLevelCount: 1,
      sampleCount: 1,
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
        depthOrArrayLayers: 1,
      },
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      viewFormats: [],
    };

    /** @type {GPUTextureViewDescriptor} */
    const defaultTextureViewDescriptor = {
      label: `Depth stencil texture view #${this.configureDepthStencil.textureViewCounter++}`,
      arrayLayerCount: 1,
      aspect: "all",
      baseArrayLayer: 0,
      baseMipLevel: 0,
      dimension: defaultTextureDescriptor.dimension,
      format: defaultTextureDescriptor.format,
      mipLevelCount: defaultTextureDescriptor.mipLevelCount,
      swizzle: "rgba",
      usage: 0,
    };

    if (this.globalDebug) {
      console.debug("%c WebGPUCore.configureDepthStencil", this.#DEBUG_STYLE);
    }

    // Set up depth stencil texture and texture view
    /** @type {GPUTextureDescriptor} */
    const finalTextureDescriptor = { ...defaultTextureDescriptor, ...textureDescriptor };
    if (this.debug) {
      console.debug("GPUTextureDescriptor", GPUTextureDescriptor);
    }
    const texture = this.device.createTexture(finalTextureDescriptor);

    /** @type {GPUTextureViewDescriptor} */
    const finalTextureViewDescriptor = { ...defaultTextureViewDescriptor, ...textureViewDescriptor };
    if (this.debug) {
      console.debug("GPUTextureViewDescriptor", finalTextureViewDescriptor);
    }
    const view = texture.createView(finalTextureViewDescriptor);

    /** @type {GPUDepthStencilState} */
    const state = {
      depthBias: undefined,
      depthBiasClamp: undefined,
      depthBiasSlopeScale: undefined,
      depthCompare: "less-equal",
      depthWriteEnabled: true,
      format: finalTextureDescriptor.format,
      stencilBack: undefined,
      stencilFront: undefined,
      stencilReadMask: undefined,
      stencilWriteMask: undefined,
    };
    if (this.debug) {
      console.debug("GPUDepthStencilState", state);
    }

    /** @type {GPURenderPassDepthStencilAttachment} */
    const attachment = {
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthReadOnly: undefined,
      depthStoreOp: "store",
      stencilClearValue: undefined,
      stencilLoadOp: "clear",
      stencilReadOnly: undefined,
      stencilStoreOp: "discard",
      view,
    };
    if (this.debug) {
      console.debug("GPURenderPassDepthStencilAttachment", attachment);
    }

    return { texture, view, state, attachment };
  }

  /**
   * @async
   * @param {AssetBlobResult[]} [resources]
   * @param {boolean} [enableMipmap]
   * @returns {{images: Object.<string, {width: number, height: number, count: number, entries: ImageBitmap[]}>, group: string, imageCount: number, mipCount: number}}
   */
  async #processImages(resources = undefined, enableMipmap = false) {
    /** @type {Object.<string, {width: number, height: number, count: number, entries: ImageBitmap[]}>} */
    const images = {};
    let group = "__default__";
    let imageCount = 0;
    let mipCount = 0;
    if (Array.isArray(resources)) {
      for (let i = 0; i < resources.length; i++) {
        let dataGroup = group;
        let dataSource;
        if (typeof resources[i] === "string") {
          // do nothing
          continue;
        } else if (resources[i] instanceof Blob) {
          dataSource = resources[i];
        } else {
          dataGroup = resources[i].group;
          dataSource = resources[i].data;
        }
        if (!Array.isArray(images[dataGroup]?.entries)) {
          images[dataGroup] = {
            width: 0,
            height: 0,
            count: 0,
            entries: [],
          };
        }
        const bitmap = await createImageBitmap(dataSource);
        images[dataGroup].width = Math.max(images[dataGroup].width, bitmap.width);
        images[dataGroup].height = Math.max(images[dataGroup].height, bitmap.height);
        images[dataGroup].count++;
        images[dataGroup].entries.push(bitmap);
        group = dataGroup;
      }
      if (enableMipmap) {
        if (
          !Object.values(images).every((obj, index, array) => obj.width === array[0].width && obj.height === array[0].height && obj.count === array[0].count)
        ) {
          throw "The image count and dimensions must be identical across all groups.";
        }
      }
      imageCount = enableMipmap ? Object.keys(images).length : images[group].entries?.length;
      mipCount = enableMipmap ? images[group].entries?.length : 1;
    } else {
      images[group] = {
        // Create texture from existing canvas
        width: this.canvas.width,
        height: this.canvas.height,
        count: 0,
        entries: [],
      };
      imageCount = 1;
      mipCount = 1;
    }

    return { images, group, imageCount, mipCount };
  }

  /**
   * @async
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture|GPUDevice: createTexture() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/createView|GPUTexture: createView() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createSampler|GPUDevice: createSampler() method}
   * @param {AssetBlobResult[]} [resources]
   * @param {Object} [options]
   * @param {boolean} [options.enableMipmap]
   * @param {GPUTextureDescriptor} [options.textureDescriptor]
   * @param {GPUTextureViewDescriptor} [options.textureViewDescriptor]
   * @param {GPUSamplerDescriptor} [options.samplerDescriptor]
   * @param {GPUBindGroupLayout} [options.bindGroupLayout]
   * @returns {{texture: GPUTexture, view: GPUTextureView, sampler: GPUSampler, bindGroupBuilder: WebGPUBindGroupBuilder}}
   */
  async createTextureViewSampler(resources = undefined, options = {}) {
    const { enableMipmap = false, textureDescriptor = {}, textureViewDescriptor = {}, samplerDescriptor = {}, bindGroupLayout = undefined } = options;

    this.createTextureViewSampler.textureCounter = this.createTextureViewSampler.textureCounter || 0;
    this.createTextureViewSampler.textureViewCounter = this.createTextureViewSampler.textureViewCounter || 0;
    this.createTextureViewSampler.samplerCounter = this.createTextureViewSampler.samplerCounter || 0;

    /** @type {GPUTextureDescriptor} */
    const defaultTextureDescriptor = {
      label: `Texture #${this.createTextureViewSampler.textureCounter++}`,
      dimension: "2d",
      format: this.format,
      mipLevelCount: 1,
      sampleCount: 1,
      size: {
        width: 0,
        height: 0,
        depthOrArrayLayers: 1,
      },
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      viewFormats: [],
    };

    /** @type {GPUTextureViewDescriptor} */
    const defaultTextureViewDescriptor = {
      label: `Texture view #${this.createTextureViewSampler.textureViewCounter++}`,
      arrayLayerCount: 1,
      aspect: "all",
      baseArrayLayer: 0,
      baseMipLevel: 0,
      dimension: "2d",
      format: defaultTextureDescriptor.format,
      mipLevelCount: defaultTextureDescriptor.mipLevelCount,
      swizzle: "rgba",
      usage: 0,
    };

    /** @type {GPUSamplerDescriptor} */
    const defaultSamplerDescriptor = {
      label: `Sampler #${this.createTextureViewSampler.samplerCounter++}`,
      addressModeU: "repeat",
      addressModeV: "repeat",
      addressModeW: "repeat",
      compare: undefined,
      lodMaxClamp: 32,
      lodMinClamp: 0,
      magFilter: "linear",
      maxAnisotropy: 1,
      minFilter: "nearest",
      mipmapFilter: "nearest",
    };

    if (this.globalDebug) {
      console.debug("%c WebGPUCore.createTextureViewSampler", this.#DEBUG_STYLE);
    }

    // Process all image resources
    const { images, group, imageCount, mipCount } = await this.#processImages(resources, enableMipmap);

    // Set up texture
    /** @type {GPUTextureDescriptor} */
    const finalTextureDescriptor = {
      ...defaultTextureDescriptor,
      ...{
        size: {
          width: images[group].width,
          height: images[group].height,
          depthOrArrayLayers: imageCount,
        },
        mipLevelCount: mipCount,
      },
      ...textureDescriptor,
    };
    if (this.debug) {
      console.debug("GPUTextureDescriptor", finalTextureDescriptor);
    }
    const texture = this.device.createTexture(finalTextureDescriptor);

    // Copy all images to the texture
    Object.entries(images).forEach(([group, data], groupIndex) => {
      data.entries.forEach((image, entryIndex) => {
        const mipIndex = enableMipmap ? entryIndex : 0;
        const zIndex = enableMipmap ? groupIndex : entryIndex;
        this.device.queue.copyExternalImageToTexture(
          { source: image },
          { texture, mipLevel: mipIndex, origin: { x: 0, y: 0, z: zIndex } },
          { width: image.width, height: image.height },
        );
        image.close();
      });
    });

    // Set up texture view and sampler
    /** @type {GPUTextureViewDescriptor} */
    const finalTextureViewDescriptor = {
      ...defaultTextureViewDescriptor,
      ...{ arrayLayerCount: imageCount, dimension: imageCount > 1 ? "2d-array" : "2d", mipLevelCount: mipCount },
      ...textureViewDescriptor,
    };
    if (this.debug) {
      console.debug("GPUTextureViewDescriptor", finalTextureViewDescriptor);
    }
    const view = texture.createView(finalTextureViewDescriptor);

    /** @type {GPUSamplerDescriptor} */
    const finalSamplerDescriptor = { ...defaultSamplerDescriptor, ...samplerDescriptor };
    if (this.debug) {
      console.debug("GPUSamplerDescriptor", finalSamplerDescriptor);
    }
    const sampler = this.device.createSampler(finalSamplerDescriptor);

    // Set up bind group builder
    const bindGroupBuilder = bindGroupLayout ? this.setupBindGroup(bindGroupLayout) : this.setupBindGroup();
    bindGroupBuilder
      .addTexture(view, GPUShaderStage.FRAGMENT, { viewDimension: finalTextureViewDescriptor.dimension })
      .addSampler(sampler, GPUShaderStage.FRAGMENT);

    return { texture, view, sampler, bindGroupBuilder };
  }

  /**
   * @param {GPUBufferUsageFlags} usage
   * @param {Int32Array|Uint32Array|Float32Array|number} [dataOrSize]
   * @returns {WebGPUBufferBuilder}
   */
  setupBuffer(usage, dataOrSize = undefined) {
    if (this.globalDebug) {
      console.debug("%c WebGPUCore.setupBuffer", this.#DEBUG_STYLE);
    }

    const builder = new WebGPUBufferBuilder(this.device);
    builder.setUsage(usage);
    if (typeof dataOrSize === "number") {
      builder.setSize(dataOrSize);
    } else {
      builder.setData(dataOrSize);
    }
    if (this.globalDebug) {
      builder.setDebug(this.globalDebug);
    }
    return builder;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/writeBuffer|GPUQueue: writeBuffer() method}
   * @param {GPUBuffer} buffer
   * @param {number} bufferOffset
   * @param {Int32Array|Uint32Array|Float32Array} data
   * @param {number} [dataOffset]
   * @param {number} [size]
   */
  queueWriteBuffer(buffer, bufferOffset, data, dataOffset = 0, size = 0) {
    if (size) {
      this.device.queue.writeBuffer(buffer, bufferOffset, data, dataOffset, size);
    } else {
      this.device.queue.writeBuffer(buffer, bufferOffset, data, dataOffset);
    }
  }

  /**
   * @param {GPUBindGroupLayout} [layout]
   * @returns {WebGPUBindGroupBuilder}
   */
  setupBindGroup(layout = undefined) {
    if (this.globalDebug) {
      console.debug("%c WebGPUCore.setupBindGroup", this.#DEBUG_STYLE);
    }

    const builder = new WebGPUBindGroupBuilder(this.device);
    if (layout instanceof GPUBindGroupLayout) {
      builder.setLayout(layout);
    }
    if (this.globalDebug) {
      builder.setDebug(this.globalDebug);
    }
    return builder;
  }

  /**
   * @param {GPUPipelineLayout} [layout]
   * @returns {WebGPUPipelineBuilder}
   */
  setupPipeline(layout = undefined) {
    if (this.globalDebug) {
      console.debug("%c WebGPUCore.setupPipeline", this.#DEBUG_STYLE);
    }

    const builder = new WebGPUPipelineBuilder(this.device);
    if (layout instanceof GPUPipelineLayout) {
      builder.setLayout(layout);
    }
    if (this.globalDebug) {
      builder.setDebug(this.globalDebug);
    }
    return builder;
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUEncoderBuilder}
   */
  setupEncoder(label = "") {
    // if (this.globalDebug) {
    //   console.debug("%c WebGPUCore.setupEncoder", this.#DEBUG_STYLE);
    // }

    this.setupEncoder.encoderCounter = this.setupEncoder.encoderCounter || 0;
    const builder = new WebGPUEncoderBuilder(this.device, label || `Command encoder #${this.setupEncoder.encoderCounter++}`);
    if (this.globalDebug) {
      builder.setDebug(this.globalDebug);
    }
    return builder;
  }

  /**
   * @param {boolean} debug
   */
  setDebug(debug) {
    this.debug = debug;
  }

  /**
   * @param {boolean} debug
   */
  setGlobalDebug(debug) {
    this.debug = debug;
    this.globalDebug = debug;
  }
}
