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
   * @type {GPUCanvasContext[]}
   */
  contexts;

  /**
   * @type {Map.<HTMLCanvasElement, function(number, number): void>}
   */
  canvasResizeEvents;

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
   * @returns {Promise.<WebGPU>}
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
    this.contexts = [];
    this.canvasResizeEvents = undefined;
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
   * @param {function(number, number): void} [callback]
   * @param {number} [scale]
   */
  observeCanvasResize(canvas, callback = undefined, scale = 1) {
    if (!this.canvasResizeEvents) {
      this.canvasResizeEvents = new Map();
    }
    if (!this.canvasResizeObserver) {
      this.canvasResizeObserver = new ResizeObserver((entries) => {
        const dpr = Math.min(2, window.devicePixelRatio) || 1;
        for (const entry of entries) {
          const width = entry.devicePixelContentBoxSize ? entry.devicePixelContentBoxSize[0].inlineSize : Math.round(entry.contentBoxSize[0].inlineSize * dpr);
          const height = entry.devicePixelContentBoxSize ? entry.devicePixelContentBoxSize[0].blockSize : Math.round(entry.contentBoxSize[0].blockSize * dpr);
          entry.target.width = Math.max(1, Math.min((width * scale) | 0, this.device.limits.maxTextureDimension2D));
          entry.target.height = Math.max(1, Math.min((height * scale) | 0, this.device.limits.maxTextureDimension2D));
          if (this.canvasResizeEvents.has(entry.target)) {
            const callback = this.canvasResizeEvents.get(entry.target);
            callback(entry.target.width, entry.target.height);
          }
        }
      });
    }
    if (callback) {
      this.canvasResizeEvents.set(canvas, callback);
    }
    this.canvasResizeObserver.observe(canvas);
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUTexture}
   */
  setupTexture(label = "Unlabelled") {
    return new WebGPUTexture(this, label);
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUDepthStencil}
   */
  setupDepthStencil(label = "Unlabelled") {
    return new WebGPUDepthStencil(this, new WebGPUTexture(this, label));
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUBuffer}
   */
  setupBuffer(label = "Unlabelled") {
    return new WebGPUBuffer(this, label);
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUBindGroup}
   */
  setupBindGroup(label = "Unlabelled") {
    return new WebGPUBindGroup(this, label);
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUPipeline}
   */
  setupPipeline(label = "Unlabelled") {
    return new WebGPUPipeline(this, label);
  }

  /**
   * @param {string} [label]
   * @returns {WebGPUEncoder}
   */
  setupEncoder(label = "Unlabelled") {
    return new WebGPUEncoder(this, label);
  }
}
