/**
 * @type {Object.<string, number>}
 */
const __gpuLabelCounts = {
  shaderModule: 0,
  depthTexture: 0,
  depthView: 0,
  imageTexture: 0,
  imageView: 0,
  imageSampler: 0,
  imageBindGroupLayout: 0,
  imageBindGroup: 0,
};

/**
 * @async
 * @param {Object} [options]
 * @param {HTMLCanvasElement} [options.canvas]
 * @param {Object} [options.adapterOptions] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPU/requestAdapter|GPU: requestAdapter() method}
 * @param {Object} [options.deviceDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUAdapter/requestDevice|GPUAdapter: requestDevice() method}
 * @param {Object} [options.canvasContextConfig] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext/configure|GPUCanvasContext: configure() method}
 * @param {function(GPUDeviceLostInfo): void} [options.deviceLostCallback] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/lost|GPUDevice: lost property}
 * @returns {{adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext}}
 */
export async function initGPU(options = {}) {
  if (!navigator.gpu) {
    throw "WebGPU is not supported in this browser.";
  }

  const {
    canvas = null,
    adapterOptions = {},
    deviceDescriptor = {},
    canvasContextConfig = {},
    deviceLostCallback = (info) => {
      if (info.reason !== "destroyed") {
        initGPU(options);
      }
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

  const finalAdapterOptions = { ...defaultAdapterOptions, ...adapterOptions };
  const adapter = await navigator.gpu.requestAdapter(finalAdapterOptions);
  if (!adapter) {
    throw "WebGPU appears to be disabled in this browser.";
  }

  const finalDeviceDescriptor = { ...defaultDeviceDescriptor, ...deviceDescriptor };
  const device = await adapter.requestDevice(finalDeviceDescriptor);

  const context = canvas instanceof HTMLCanvasElement ? canvas.getContext("webgpu") : null;
  if (context instanceof GPUCanvasContext) {
    const format = canvasContextConfig.format || navigator.gpu.getPreferredCanvasFormat();
    const finalCanvasContextConfig = { ...defaultCanvasContextConfig, ...canvasContextConfig, ...{ device, format } };
    context.configure(finalCanvasContextConfig);
  }

  device.lost.then((info) => {
    console.error(`WebGPU device lost: ${info.message} [${info.reason}]`);
    device = null;
    if (typeof deviceLostCallback === "function") {
      deviceLostCallback(info);
    }
  });

  return { adapter, device, context };
}

/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createShaderModule|GPUDevice: createShaderModule() method}
 * @param {GPUDevice} device
 * @param {string} resource
 * @param {Object} [options]
 * @param {string} [options.label]
 * @param {Object} [options.hints]
 * @param {string[][]} [options.replacements] Example: `[["fromThis", "toThat"], ["anotherThis", "anotherThat"]]`
 * @returns {GPUShaderModule}
 */
export function makeShaderModule(device, resource, options = {}) {
  if (!(device instanceof GPUDevice)) {
    throw "Invalid argument, expected type: GPUDevice.";
  }

  const { label = `Shader module: #${__gpuLabelCounts.shaderModule++}`, hints = {}, replacements = [] } = options;

  const code = replacements.reduce((text, [from, to]) => {
    return text.replaceAll(from, to);
  }, resource);

  return device.createShaderModule({ code, hints, label });
}

/**
 * @param {GPUCanvasContext} context
 * @param {Object} [options]
 * @param {GPUTextureDescriptor} [options.textureDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture|GPUDevice: createTexture() method}
 * @param {GPUTextureViewDescriptor} [options.viewDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/createView|GPUTexture: createView() method}
 * @returns {{depthStencil: GPUDepthStencilState, depthStencilTexture: GPUTexture, depthStencilView: GPUTextureView, depthStencilAttachment: GPURenderPassDepthStencilAttachment}}
 */
export function makeDepthStencilSettings(context, options = {}) {
  if (!(context instanceof GPUCanvasContext)) {
    throw "Invalid argument, expected type: GPUCanvasContext.";
  }

  const { textureDescriptor = {}, viewDescriptor = {} } = options;

  const device = context.getConfiguration().device;
  const canvas = context.canvas;

  const defaultTextureDescriptor = {
    dimension: "2d",
    format: "depth24plus-stencil8",
    label: `Depth texture: #${__gpuLabelCounts.depthTexture++}`,
    mipLevelCount: 1,
    sampleCount: 1,
    size: {
      width: canvas.width,
      height: canvas.height,
      depthOrArrayLayers: 1,
    },
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    viewFormats: [],
  };
  const defaultViewDescriptor = {
    arrayLayerCount: 1,
    aspect: "all",
    baseArrayLayer: 0,
    baseMipLevel: 0,
    dimension: defaultTextureDescriptor.dimension,
    format: defaultTextureDescriptor.format,
    label: `Depth view: #${__gpuLabelCounts.imageView++}`,
    mipLevelCount: defaultTextureDescriptor.mipLevelCount,
    swizzle: "rgba",
    usage: defaultTextureDescriptor.usage,
  };

  const finalTextureDescriptor = { ...defaultTextureDescriptor, ...textureDescriptor };
  const depthStencilTexture = device.createTexture(finalTextureDescriptor);

  const finalViewDescriptor = { ...defaultViewDescriptor, ...viewDescriptor };
  const depthStencilView = depthStencilTexture.createView(finalViewDescriptor);

  const depthStencil = {
    format: "depth24plus-stencil8",
    depthWriteEnabled: true,
    depthCompare: "less-equal",
  };
  const depthStencilAttachment = {
    view: depthStencilView,
    depthClearValue: 1.0,
    depthLoadOp: "clear",
    depthStoreOp: "store",
    stencilLoadOp: "clear",
    stencilStoreOp: "discard",
  };

  return { depthStencil, depthStencilTexture, depthStencilView, depthStencilAttachment };
}

/**
 * @async
 * @param {GPUCanvasContext} context
 * @param {Blob[]} blobs
 * @param {Object} [options]
 * @param {GPUTextureDescriptor} [options.textureDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture|GPUDevice: createTexture() method}
 * @param {GPUTextureViewDescriptor} [options.viewDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/createView|GPUTexture: createView() method}
 * @param {GPUSamplerDescriptor} [options.samplerDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createSampler|GPUDevice: createSampler() method}
 * @param {boolean|GPUBindGroupLayout} [options.defaultBindGroup]
 * @returns {{texture: GPUTexture, view: GPUTextureView, sampler: GPUSampler, bindGroupLayout: GPUBindGroupLayout|null, bindGroup: GPUBindGroup|null}}
 */
export async function makeImagesTexture(context, blobs, options = {}) {
  if (!(context instanceof GPUCanvasContext)) {
    throw "Invalid argument, expected type: GPUCanvasContext.";
  }

  const { textureDescriptor = {}, viewDescriptor = {}, samplerDescriptor = {}, createBindGroup = false } = options;

  const { device, format } = context.getConfiguration();

  const defaultTextureDescriptor = {
    dimension: "2d",
    format: format,
    label: `Image texture: #${__gpuLabelCounts.imageTexture++}`,
    mipLevelCount: 1,
    sampleCount: 1,
    size: {
      width: 0,
      height: 0,
      depthOrArrayLayers: blobs.length,
    },
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    viewFormats: [],
  };
  const defaultViewDescriptor = {
    arrayLayerCount: blobs.length,
    aspect: "all",
    baseArrayLayer: 0,
    baseMipLevel: 0,
    dimension: blobs.length > 1 ? "2d-array" : defaultTextureDescriptor.dimension,
    format: defaultTextureDescriptor.format,
    label: `Image view: #${__gpuLabelCounts.imageView++}`,
    mipLevelCount: defaultTextureDescriptor.mipLevelCount,
    swizzle: "rgba",
    usage: defaultTextureDescriptor.usage,
  };
  const defaultSamplerDescriptor = {
    addressModeU: "repeat",
    addressModeV: "repeat",
    addressModeW: "repeat",
    compare: undefined,
    label: `Image sampler: #${__gpuLabelCounts.imageSampler++}`,
    lodMinClamp: 0,
    lodMaxClamp: 32,
    maxAnisotropy: 1,
    magFilter: "linear",
    minFilter: "nearest",
    mipmapFilter: "nearest",
  };

  const images = [];
  let width = 0;
  let height = 0;
  for (let i = 0; i < blobs.length; i++) {
    const resource = await createImageBitmap(blobs[i]);
    width = Math.max(width, resource.width);
    height = Math.max(height, resource.height);
    images.push(resource);
  }

  const finalTextureDescriptor = {
    ...defaultTextureDescriptor,
    ...textureDescriptor,
    ...{ size: { width, height, depthOrArrayLayers: blobs.length } },
  };
  const texture = device.createTexture(finalTextureDescriptor);

  images.forEach((source, index) => {
    device.queue.copyExternalImageToTexture({ source }, { texture, origin: { x: 0, y: 0, z: index } }, { width, height });
  });

  const finalViewDescriptor = { ...defaultViewDescriptor, ...viewDescriptor };
  const view = texture.createView(finalViewDescriptor);

  const finalSamplerDescriptor = { ...defaultSamplerDescriptor, ...samplerDescriptor };
  const sampler = device.createSampler(finalSamplerDescriptor);

  const bindGroupLayout =
    createBindGroup instanceof GPUBindGroupLayout
      ? createBindGroup
      : createBindGroup
        ? device.createBindGroupLayout({
            label: `Image bind group layout: #${__gpuLabelCounts.imageBindGroupLayout++}`,
            entries: [
              {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                texture: { viewDimension: finalViewDescriptor.dimension },
              },
              {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {},
              },
            ],
          })
        : null;

  const bindGroup = bindGroupLayout
    ? device.createBindGroup({
        label: `Image bind group: #${__gpuLabelCounts.imageBindGroup++}`,
        layout: bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: view,
          },
          {
            binding: 1,
            resource: sampler,
          },
        ],
      })
    : null;

  return { texture, view, sampler, bindGroupLayout, bindGroup };
}
