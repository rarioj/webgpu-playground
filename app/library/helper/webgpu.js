/**
 * @async
 * @param {Object} [options]
 * @param {HTMLCanvasElement} [options.canvas]
 * @param {Object} [options.adapterOptions] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPU/requestAdapter|GPU: requestAdapter() method}
 * @param {Object} [options.deviceDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUAdapter/requestDevice|GPUAdapter: requestDevice() method}
 * @param {function(GPUDeviceLostInfo): void} [options.deviceLostCallback] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/lost|GPUDevice: lost property}
 * @param {Object} [options.canvasContextConfig] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext/configure|GPUCanvasContext: configure() method}
 * @returns {{adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext}}
 */
export async function initGPU(options = {}) {
  if (!navigator.gpu) {
    throw "WebGPU is not supported in this browser.";
  }

  const {
    canvas = null,
    adapterOptions = {
      featureLevel: "core",
      powerPreference: "high-performance",
    },
    deviceDescriptor = {
      defaultQueue: { label: "Default GPUQueue" },
      label: "Default GPUDevice",
      requiredFeatures: ["core-features-and-limits"],
      requiredLimits: { maxBindGroups: 4 },
    },
    deviceLostCallback = (info) => {
      if (info.reason !== "destroyed") {
        initGPU(options);
      }
    },
    canvasContextConfig = {
      alphaMode: "opaque",
      colorSpace: "srgb",
      format: navigator.gpu.getPreferredCanvasFormat(),
      toneMapping: { mode: "standard" },
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      viewFormats: [],
    },
  } = options;

  const adapter = await navigator.gpu.requestAdapter(adapterOptions);
  if (!adapter) {
    throw "WebGPU appears to be disabled in this browser.";
  }

  const device = await adapter.requestDevice(deviceDescriptor);
  device.lost.then((info) => {
    console.error(`WebGPU device lost: ${info.message} [${info.reason}]`);
    device = null;
    if (typeof deviceLostCallback === "function") {
      deviceLostCallback(info);
    }
  });

  const context = canvas instanceof HTMLCanvasElement ? canvas.getContext("webgpu") : null;
  canvasContextConfig.format = canvasContextConfig.format || navigator.gpu.getPreferredCanvasFormat();
  if (context instanceof GPUCanvasContext) {
    canvasContextConfig.device = device;
    context.configure(canvasContextConfig);
  }

  return { adapter, device, context };
}

/**
 * @type {Object.<string, number>}
 */
const __gpuLabelCounts = {
  shaderModule: 0,
  imageTexture: 0,
  imageView: 0,
  imageSampler: 0,
  imageBindGroupLayout: 0,
  imageBindGroup: 0,
};

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
 * @async
 * @param {GPUCanvasContext} context
 * @param {Blob[]} blobs
 * @param {Object} [options]
 * @param {GPUTextureDescriptor} [options.textureDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture|GPUDevice: createTexture() method}
 * @param {GPUTextureViewDescriptor} [options.viewDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/createView|GPUTexture: createView() method}
 * @param {GPUSamplerDescriptor} [options.samplerDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createSampler|GPUDevice: createSampler() method}
 * @param {boolean} [options.defaultBindGroup]
 * @returns {{texture: GPUTexture, view: GPUTextureView, sampler: GPUSampler, bindGroupLayout: GPUBindGroupLayout|null, bindGroup: GPUBindGroup|null}}
 */
export async function makeImagesTexture(context, blobs, options = {}) {
  if (!(context instanceof GPUCanvasContext)) {
    throw "Invalid argument, expected type: GPUCanvasContext.";
  }

  const { device, format } = context.getConfiguration();

  const {
    textureDescriptor = {
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
    },
    viewDescriptor = {
      arrayLayerCount: blobs.length,
      aspect: "all",
      baseArrayLayer: 0,
      baseMipLevel: 0,
      dimension: blobs.length > 1 ? "2d-array" : textureDescriptor.dimension,
      format: textureDescriptor.format,
      label: `Image view: #${__gpuLabelCounts.imageView++}`,
      mipLevelCount: textureDescriptor.mipLevelCount,
      swizzle: "rgba",
      usage: textureDescriptor.usage,
    },
    samplerDescriptor = {
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
    },
    createBindGroup = false,
  } = options;

  const images = [];
  for (let i = 0; i < blobs.length; i++) {
    const resource = await createImageBitmap(blobs[i]);
    textureDescriptor.size.width = Math.max(textureDescriptor.size.width, resource.width);
    textureDescriptor.size.height = Math.max(textureDescriptor.size.height, resource.height);
    images.push(resource);
  }

  const texture = device.createTexture(textureDescriptor);
  images.forEach((image, index) => {
    device.queue.copyExternalImageToTexture(
      { source: image },
      { texture, origin: { x: 0, y: 0, z: index } },
      { width: textureDescriptor.size.width, height: textureDescriptor.size.height },
    );
  });
  const view = texture.createView(viewDescriptor);
  const sampler = device.createSampler(samplerDescriptor);

  const bindGroupLayout = createBindGroup
    ? device.createBindGroupLayout({
        label: `Image bind group layout: #${__gpuLabelCounts.imageBindGroupLayout++}`,
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { viewDimension: viewDescriptor.dimension },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {},
          },
        ],
      })
    : null;

  const bindGroup = createBindGroup
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
