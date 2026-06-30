import { BindGroupBuilder } from "./BindGroupBuilder.js";
import { PipelineBuilder } from "./PipelineBuilder.js";
import { BufferBuilder } from "./BufferBuilder.js";

/**
 * @classdesc
 */
export class WebGPUWrapper {
  /**
   * @type {HTMLCanvasElement}
   */
  canvas = null;

  /**
   * @type {GPUAdapter}
   */
  adapter = null;

  /**
   * @type {GPUDevice}
   */
  device = null;

  /**
   * @type {GPUCanvasContext}
   */
  context = null;

  /**
   * @type {string}
   */
  format = "";

  /**
   * @type {number}
   */
  labelCounter = 0;

  /**
   * @param {HTMLCanvasElement|null} [canvas]
   */
  constructor(canvas = null) {
    this.canvas = canvas;
  }

  /**
   * @async
   * @param {Object} [options]
   * @param {GPURequestAdapterOptions} [options.adapterOptions] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPU/requestAdapter|GPU: requestAdapter() method}
   * @param {GPUDeviceDescriptor} [options.deviceDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUAdapter/requestDevice|GPUAdapter: requestDevice() method}
   * @param {GPUCanvasConfiguration} [options.canvasContextConfig] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext/configure|GPUCanvasContext: configure() method}
   * @param {function(GPUDeviceLostInfo): void} [options.deviceLostCallback] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/lost|GPUDevice: lost property}
   * @returns {{adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext|null, format: string}}
   */
  async init(options = {}) {
    if (!navigator.gpu) {
      throw "WebGPU is not supported in this browser.";
    }

    const { adapterOptions = {}, deviceDescriptor = {}, canvasContextConfig = {}, deviceLostCallback = null } = options;

    const defaultAdapterOptions = {
      featureLevel: "core",
      powerPreference: "high-performance",
    };
    const defaultDeviceDescriptor = {
      defaultQueue: { label: "Default GPUQueue" },
      label: "Default GPUDevice",
      requiredFeatures: ["core-features-and-limits"],
      requiredLimits: { maxBindGroups: 4 },
    };
    const defaultCanvasContextConfig = {
      device: null,
      alphaMode: "opaque",
      colorSpace: "srgb",
      format: navigator.gpu.getPreferredCanvasFormat(),
      toneMapping: { mode: "standard" },
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      viewFormats: [],
    };

    this.adapter = await navigator.gpu.requestAdapter({ ...defaultAdapterOptions, ...adapterOptions });
    if (!this.adapter) {
      throw "WebGPU appears to be disabled in this browser.";
    }

    this.device = await this.adapter.requestDevice({ ...defaultDeviceDescriptor, ...deviceDescriptor });
    this.device.lost.then((info) => {
      console.error(`WebGPU device lost: ${info.message} [${info.reason}]`);
      this.device = null;
      if (typeof deviceLostCallback === "function") {
        deviceLostCallback(info);
      }
    });

    this.context = this.canvas instanceof HTMLCanvasElement ? this.canvas.getContext("webgpu") : null;
    if (this.context instanceof GPUCanvasContext) {
      this.context.configure({ ...defaultCanvasContextConfig, ...{ device: this.device }, ...canvasContextConfig });
      this.format = this.context.getConfiguration().format;
    }

    return { adapter: this.adapter, device: this.device, context: this.context, format: this.format };
  }

  /**
   * @param {Object} [options]
   * @param {GPUTextureDescriptor} [options.textureDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture|GPUDevice: createTexture() method}
   * @param {GPUTextureViewDescriptor} [options.textureViewDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/createView|GPUTexture: createView() method}
   * @returns {{texture: GPUTexture, view: GPUTextureView, state: GPUDepthStencilState, attachment: GPURenderPassDepthStencilAttachment}}
   */
  setupDepthStencil(options = {}) {
    const { textureDescriptor = {}, textureViewDescriptor = {} } = options;

    const defaultTextureDescriptor = {
      dimension: "2d",
      format: "depth24plus-stencil8",
      label: `Depth stencil texture #${this.labelCounter++}`,
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
    const defaultTextureViewDescriptor = {
      arrayLayerCount: 1,
      aspect: "all",
      baseArrayLayer: 0,
      baseMipLevel: 0,
      dimension: defaultTextureDescriptor.dimension,
      format: defaultTextureDescriptor.format,
      label: `Depth stencil texture view #${this.labelCounter++}`,
      mipLevelCount: defaultTextureDescriptor.mipLevelCount,
      swizzle: "rgba",
      usage: undefined,
    };

    const finalTextureDescriptor = { ...defaultTextureDescriptor, ...textureDescriptor };
    const texture = this.device.createTexture(finalTextureDescriptor);
    const view = texture.createView({ ...defaultTextureViewDescriptor, ...textureViewDescriptor });

    const state = {
      format: finalTextureDescriptor.format,
      depthWriteEnabled: true,
      depthCompare: "less-equal",
    };
    const attachment = {
      view: view,
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
      stencilLoadOp: "clear",
      stencilStoreOp: "discard",
    };

    return { texture, view, state, attachment };
  }

  /**
   * @async
   * @param {Blob[]|{group: string, data: Blob}[]|null} [blobs]
   * @param {Object} [options]
   * @param {boolean} [options.enableMipmap]
   * @param {GPUTextureDescriptor} [options.textureDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture|GPUDevice: createTexture() method}
   * @param {GPUTextureViewDescriptor} [options.textureViewDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/createView|GPUTexture: createView() method}
   * @param {GPUSamplerDescriptor} [options.samplerDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createSampler|GPUDevice: createSampler() method}
   * @param {GPUBindGroupLayout|null} [options.bindGroupLayout]
   * @returns {{texture: GPUTexture, view: GPUTextureView, sampler: GPUSampler, bindGroupBuilder: BindGroupBuilder}}
   */
  async createTextureViewSampler(blobs = null, options = {}) {
    const { enableMipmap = false, textureDescriptor = {}, textureViewDescriptor = {}, samplerDescriptor = {}, bindGroupLayout = null } = options;

    const defaultTextureDescriptor = {
      dimension: "2d",
      format: this.format,
      label: `Texture #${this.labelCounter++}`,
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
    const defaultTextureViewDescriptor = {
      arrayLayerCount: 1,
      aspect: "all",
      baseArrayLayer: 0,
      baseMipLevel: 0,
      dimension: "2d",
      format: defaultTextureDescriptor.format,
      label: `Texture view #${this.labelCounter++}`,
      mipLevelCount: defaultTextureDescriptor.mipLevelCount,
      swizzle: "rgba",
      usage: undefined,
    };
    const defaultSamplerDescriptor = {
      addressModeU: "repeat",
      addressModeV: "repeat",
      addressModeW: "repeat",
      compare: undefined,
      label: `Sampler #${this.labelCounter++}`,
      lodMinClamp: 0,
      lodMaxClamp: 32,
      maxAnisotropy: 1,
      magFilter: "linear",
      minFilter: "nearest",
      mipmapFilter: "nearest",
    };

    const images = {};
    let mainGroup = "__default__";
    let imageCount = 0;
    let mipCount = 0;
    if (Array.isArray(blobs)) {
      for (let i = 0; i < blobs.length; i++) {
        let dataGroup = mainGroup;
        let dataSource = null;
        if (blobs[i] instanceof Blob) {
          dataSource = blobs[i];
        } else {
          dataGroup = blobs[i].group;
          dataSource = blobs[i].data;
        }
        if (!Array.isArray(images[dataGroup]?.entries)) {
          images[dataGroup] = {
            width: 0,
            height: 0,
            count: 0,
            entries: [],
          };
        }
        const resource = await createImageBitmap(dataSource);
        images[dataGroup].width = Math.max(images[dataGroup].width, resource.width);
        images[dataGroup].height = Math.max(images[dataGroup].height, resource.height);
        images[dataGroup].count++;
        images[dataGroup].entries.push(resource);
        mainGroup = dataGroup;
      }
      if (enableMipmap) {
        if (
          !Object.values(images).every((obj, index, array) => obj.width === array[0].width && obj.height === array[0].height && obj.count === array[0].count)
        ) {
          throw "The image count and dimensions must be identical across all groups.";
        }
      }
      imageCount = enableMipmap ? Object.keys(images).length : images[mainGroup].entries?.length;
      mipCount = enableMipmap ? images[mainGroup].entries?.length : 1;
    } else {
      images[mainGroup] = {
        // Create texture from existing canvas
        width: this.canvas.width,
        height: this.canvas.height,
        count: 0,
        entries: [],
      };
      imageCount = 1;
      mipCount = 1;
    }

    const texture = this.device.createTexture({
      ...defaultTextureDescriptor,
      ...{ size: { width: images[mainGroup].width, height: images[mainGroup].height, depthOrArrayLayers: imageCount }, mipLevelCount: mipCount },
      ...textureDescriptor,
    });

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

    const finalTextureViewDescriptor = {
      ...defaultTextureViewDescriptor,
      ...{ arrayLayerCount: imageCount, dimension: imageCount > 1 ? "2d-array" : "2d", mipLevelCount: mipCount },
      ...textureViewDescriptor,
    };
    const view = texture.createView(finalTextureViewDescriptor);

    const sampler = this.device.createSampler({ ...defaultSamplerDescriptor, ...samplerDescriptor });

    const bindGroupBuilder = bindGroupLayout ? this.setupBindGroup(bindGroupLayout) : this.setupBindGroup();
    bindGroupBuilder
      .addTexture(view, GPUShaderStage.FRAGMENT, { viewDimension: finalTextureViewDescriptor.dimension })
      .addSampler(sampler, GPUShaderStage.FRAGMENT);

    return { texture, view, sampler, bindGroupBuilder };
  }

  /**
   * @param {GPUBufferUsageFlags} usage
   * @param {Int32Array|Uint32Array|Float32Array|number} [dataOrSize]
   * @returns {BufferBuilder}
   */
  setupBuffer(usage, dataOrSize) {
    const builder = new BufferBuilder(this.device);
    builder.setLabel(`Buffer #${this.labelCounter++}`);
    builder.setUsage(usage);

    if (typeof dataOrSize === "number") {
      builder.setSize(dataOrSize);
    } else {
      builder.setData(dataOrSize);
    }

    return builder;
  }

  /**
   * @param {GPUBindGroupLayout|null} [layout]
   * @returns {BindGroupBuilder}
   */
  setupBindGroup(layout = null) {
    const builder = new BindGroupBuilder(this.device);

    if (layout instanceof GPUBindGroupLayout) {
      builder.setLayout(layout);
      builder.setLabel(`Bind group #${this.labelCounter++}`);
    } else {
      builder.setLabel(`Bind group #${this.labelCounter++}`, `Bind group layout #${this.labelCounter++}`);
    }

    return builder;
  }

  /**
   * @param {GPUPipelineLayout|null} [layout]
   * @returns {PipelineBuilder}
   */
  setupPipeline(layout = null) {
    const builder = new PipelineBuilder(this.device);

    if (layout instanceof GPUPipelineLayout) {
      builder.setPipelineLayout(layout);
      builder.setLabel(`Pipeline #${this.labelCounter++}`);
    } else {
      builder.setLabel(`Pipeline #${this.labelCounter++}`, `Pipeline layout #${this.labelCounter++}`);
    }

    return builder;
  }
}
