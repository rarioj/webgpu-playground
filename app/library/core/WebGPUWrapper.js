import { BindGroupBuilder } from "./BindGroupBuilder.js";
import { PipelineBuilder } from "./PipelineBuilder.js";

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
  #autoLabel = 0;

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
   */
  async init(options = {}) {
    if (!navigator.gpu) {
      throw "WebGPU is not supported in this browser.";
    }

    const {
      adapterOptions = {},
      deviceDescriptor = {},
      canvasContextConfig = {},
      deviceLostCallback = (info) => {
        console.error(`WebGPU device lost: ${info.message} [${info.reason}]`);
      },
    } = options;

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
      this.device = null;
      deviceLostCallback(info);
    });

    this.context = this.canvas instanceof HTMLCanvasElement ? this.canvas.getContext("webgpu") : null;
    if (this.context instanceof GPUCanvasContext) {
      this.context.configure({ ...defaultCanvasContextConfig, ...{ device: this.device }, ...canvasContextConfig });
      this.format = this.context.getConfiguration().format;
    }
  }

  /**
   * @param {string} code
   * @param {Object} [options]
   * @param {string[][]} [options.replacements] Example: `[["fromThis", "toThat"], ["anotherThis", "anotherThat"]]`
   * @param {GPUShaderModuleDescriptor} [options.shaderModuleDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createShaderModule|GPUDevice: createShaderModule() method}
   * @returns {GPUShaderModule}
   */
  createShaderModule(code, options = {}) {
    const { replacements = [], shaderModuleDescriptor = {} } = options;

    const defaultShaderModuleDescriptor = {
      code,
      hints: {},
      label: `Shader module #${this.#autoLabel++}`,
    };

    const finalCode = replacements.reduce((text, [from, to]) => {
      return text.replaceAll(from, to);
    }, code);

    return this.device.createShaderModule({ ...defaultShaderModuleDescriptor, ...{ code: finalCode }, ...shaderModuleDescriptor });
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
      label: `Texture #${this.#autoLabel++}`,
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
      label: `Texture view #${this.#autoLabel++}`,
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
   * @param {GPUBindGroupLayout} [options.bindGroupLayout]
   * @param {GPUTextureDescriptor} [options.textureDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture|GPUDevice: createTexture() method}
   * @param {GPUTextureViewDescriptor} [options.textureViewDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/createView|GPUTexture: createView() method}
   * @param {GPUSamplerDescriptor} [options.samplerDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createSampler|GPUDevice: createSampler() method}
   * @returns {{texture: GPUTexture, view: GPUTextureView, sampler: GPUSampler, builder: BindGroupBuilder}}
   */
  async createTextureViewSampler(blobs = null, options = {}) {
    const { enableMipmap = false, bindGroupLayout = null, textureDescriptor = {}, textureViewDescriptor = {}, samplerDescriptor = {} } = options;

    const defaultTextureDescriptor = {
      dimension: "2d",
      format: this.format,
      label: `Texture #${this.#autoLabel++}`,
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
      label: `Texture view #${this.#autoLabel++}`,
      mipLevelCount: defaultTextureDescriptor.mipLevelCount,
      swizzle: "rgba",
      usage: undefined,
    };
    const defaultSamplerDescriptor = {
      addressModeU: "repeat",
      addressModeV: "repeat",
      addressModeW: "repeat",
      compare: undefined,
      label: `Sampler #${this.#autoLabel++}`,
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

    const bindGroupBuilder = this.setupBindGroup()
      .addTexture(view, GPUShaderStage.FRAGMENT, { viewDimension: finalTextureViewDescriptor.dimension })
      .addSampler(sampler, GPUShaderStage.FRAGMENT);

    if (bindGroupLayout) {
      bindGroupBuilder.setLayout(bindGroupLayout);
    }

    return { texture, view, sampler, bindGroupBuilder };
  }

  /**
   * @param {GPUBindGroupLayout|null} [layout]
   * @returns {BindGroupBuilder}
   */
  setupBindGroup(layout = null) {
    const builder = new BindGroupBuilder(this.device);

    if (layout instanceof GPUBindGroupLayout) {
      builder.setLayout(layout);
      builder.setLabel(`Bind group #${this.#autoLabel++}`);
    } else {
      builder.setLabel(`Bind group #${this.#autoLabel++}`, `Bind group layout #${this.#autoLabel++}`);
    }

    return builder;
  }

  /**
   * @param {GPUPipelineLayout|null} [layout]
   * @param {PipelineBuilder}
   */
  setupPipeline(layout = null) {
    const builder = new PipelineBuilder(this.device);

    if (layout instanceof GPUPipelineLayout) {
      builder.setPipelineLayout(layout);
      builder.setLabel(`Pipeline #${this.#autoLabel++}`);
    } else {
      builder.setLabel(`Pipeline #${this.#autoLabel++}`, `Pipeline layout #${this.#autoLabel++}`);
    }

    return builder;
  }
}
