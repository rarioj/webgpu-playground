import { WebGPUTexture } from "./WebGPUTexture.js";
import { WebGPUDepthStencil } from "./WebGPUDepthStencil.js";
import { WebGPUBuffer } from "./WebGPUBuffer.js";
import { WebGPUBindGroup } from "./WebGPUBindGroup.js";
import { WebGPUPipeline } from "./WebGPUPipeline.js";
import { WebGPUEncoder } from "./WebGPUEncoder.js";

/**
 * @classdesc
 */
export class WebGPU {
  /**
   * @type {boolean}
   */
  debug;

  /**
   * @type {GPUAdapter}
   */
  adapter;

  /**
   * @type {GPUDevice}
   */
  device;

  /**
   * @type {GPUQueue}
   */
  queue;

  /**
   * @type {GPUCanvasContext[]}
   */
  contexts;

  /**
   * @type {Map.<HTMLCanvasElement, function(): void>}
   */
  canvasResizeCallbacks;

  /**
   * @type {ResizeObserver}
   */
  canvasResizeObserver;

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPU/requestAdapter|GPU: requestAdapter() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUAdapter/requestDevice|GPUAdapter: requestDevice() method}
   * @param {Object} [options]
   * @param {boolean} [options.debug]
   * @param {GPURequestAdapterOptions} [options.requestAdapterOptions]
   * @param {GPUDeviceDescriptor} [options.deviceDescriptor]
   * @returns {WebGPU}
   */
  static async init(options = {}) {
    const { debug = false, requestAdapterOptions = {}, deviceDescriptor = {} } = options;

    if (!navigator.gpu) {
      throw new Error("WebGPU is not supported in this browser");
    }

    /** @type {GPURequestAdapterOptions} */
    const defaultRequestAdapterOptions = {
      powerPreference: "high-performance",
    };
    /** @type {GPURequestAdapterOptions} */
    const finalRequestAdapterOptions = { ...defaultRequestAdapterOptions, ...requestAdapterOptions };
    debug && console.debug("GPURequestAdapterOptions", finalRequestAdapterOptions);
    const adapter = await navigator.gpu.requestAdapter(finalRequestAdapterOptions);

    if (!adapter) {
      throw new Error("Unable to request WebGPU adapter");
    }

    /** @type {GPUDeviceDescriptor} */
    const defaultDeviceDescriptor = {
      requiredFeatures: ["core-features-and-limits"],
    };
    /** @type {GPUDeviceDescriptor} */
    const finalDeviceDescriptor = { ...defaultDeviceDescriptor, ...deviceDescriptor };
    debug && console.debug("GPUDeviceDescriptor", finalDeviceDescriptor);
    const device = await adapter.requestDevice(finalDeviceDescriptor);

    if (!device) {
      throw new Error("Unable to request WebGPU device");
    }

    const webgpu = new WebGPU(adapter, device);
    webgpu.debug = debug;
    return webgpu;
  }

  /**
   * @param {GPUAdapter} adapter
   * @param {GPUDevice} device
   */
  constructor(adapter, device) {
    if (!(adapter instanceof GPUAdapter) || !(device instanceof GPUDevice)) {
      throw new Error("Use `await WebGPU.init({debug, requestAdapterOptions, deviceDescriptor})` to instantiate WebGPU system");
    }

    this.debug = false;
    this.adapter = adapter;
    this.device = device;
    this.queue = device.queue;
    this.contexts = [];
    this.canvasResizeCallbacks = undefined;
    this.canvasResizeObserver = undefined;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext/configure|GPUCanvasContext: configure() method}
   * @param {HTMLCanvasElement} canvas
   * @param {GPUCanvasConfiguration} [canvasConfiguration]
   */
  createCanvasContext(canvas, canvasConfiguration = {}) {
    /** @type {GPUCanvasConfiguration} */
    const defaultCanvasConfiguration = {
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
    };
    /** @type {GPUCanvasConfiguration} */
    const finalCanvasConfiguration = { ...defaultCanvasConfiguration, ...canvasConfiguration };
    this.debug && console.debug("GPUCanvasConfiguration", finalCanvasConfiguration);

    const context = canvas.getContext("webgpu");
    context.configure(finalCanvasConfiguration);

    this.contexts.push(context);
    return context;
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {function(): void} [callback]
   */
  observeCanvasResize(canvas, callback = undefined) {
    if (!this.canvasResizeCallbacks) {
      this.canvasResizeCallbacks = new Map();
    }
    if (!this.canvasResizeObserver) {
      this.canvasResizeObserver = new ResizeObserver((entries) => {
        const dpr = Math.min(2, window.devicePixelRatio) || 1;
        for (const entry of entries) {
          entry.target.width = entry.devicePixelContentBoxSize
            ? entry.devicePixelContentBoxSize[0].inlineSize
            : Math.round(entry.contentBoxSize[0].inlineSize * dpr);
          entry.target.height = entry.devicePixelContentBoxSize
            ? entry.devicePixelContentBoxSize[0].blockSize
            : Math.round(entry.contentBoxSize[0].blockSize * dpr);
          if (this.canvasResizeCallbacks.has(entry.target)) {
            const callback = this.canvasResizeCallbacks.get(entry.target);
            callback(entry.target.width, entry.target.height);
          }
        }
      });
    }
    if (callback) {
      this.canvasResizeCallbacks.set(canvas, callback);
    }
    this.canvasResizeObserver.observe(canvas);
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUTexture}
   */
  setupTextureView(label = "Unlabelled") {
    const builder = new WebGPUTexture(this.device, label);
    builder.debug = this.debug;
    return builder;
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUDepthStencil}
   */
  setupDepthStencil(label = "Unlabelled") {
    const textureBuilder = new WebGPUTexture(this.device, label);
    const builder = new WebGPUDepthStencil(this.device, textureBuilder);
    builder.debug = this.debug;
    return builder;
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUBuffer}
   */
  setupBuffer(label = "Unlabelled") {
    const builder = new WebGPUBuffer(this.device, label);
    builder.debug = this.debug;
    return builder;
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUBindGroup}
   */
  setupBindGroup(label = "Unlabelled") {
    const builder = new WebGPUBindGroup(this.device, label);
    builder.debug = this.debug;
    return builder;
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUPipeline}
   */
  setupPipeline(label = "Unlabelled") {
    const builder = new WebGPUPipeline(this.device, label);
    builder.debug = this.debug;
    return builder;
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUEncoder}
   */
  setupEncoder(label = "Unlabelled") {
    const proxy = new WebGPUEncoder(this.device, label);
    proxy.debug = this.debug;
    return proxy;
  }
}
