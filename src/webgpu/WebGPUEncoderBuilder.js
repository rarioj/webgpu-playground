/**
 * @classdesc
 */
export class WebGPUEncoderBuilder {
  /**
   * @type {GPUDevice}
   */
  device;

  /**
   * @type {GPUCommandEncoder}
   */
  commandEncoder;

  /**
   * @type {GPURenderPassEncoder|GPUComputePassEncoder}
   */
  activePassEncoder;

  /**
   * @type {WebGPUEncoderBuilder}
   */
  proxy;

  /**
   * @type {boolean}
   */
  debug;

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createCommandEncoder|GPUDevice: createCommandEncoder() method}
   * @param {GPUDevice} device
   * @param {string} [label]
   */
  constructor(device, label = "") {
    this.device = device;

    const commandEncoderDescriptor = {
      label: label || "Default command encoder",
    };
    this.commandEncoder = this.device.createCommandEncoder(commandEncoderDescriptor);
    this.activePassEncoder = null;

    this.proxy = new Proxy(this, {
      get(target, property, receiver) {
        if (property in target) {
          const builderValue = target[property];
          if (typeof builderValue === "function") {
            return builderValue.bind(target);
          }
          return builderValue;
        }

        if (target.activePassEncoder) {
          const checkPassEncoder = target.activePassEncoder;
          if (typeof checkPassEncoder[property] === "function") {
            return function (...args) {
              const result = checkPassEncoder[property].apply(checkPassEncoder, args);
              if (property === "end") {
                target.activePassEncoder = null;
              }
              return target.proxy;
            };
          }
        }

        const checkCommandEncoder = target.commandEncoder;
        if (typeof checkCommandEncoder[property] === "function") {
          return function (...args) {
            const result = checkCommandEncoder[property].apply(checkCommandEncoder, args);
            return target.proxy;
          };
        }

        return checkCommandEncoder[property];
      },
    });

    return this.proxy;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass|GPUCommandEncoder: beginRenderPass() method}
   * @param {GPURenderPassDescriptor} descriptor
   * @returns {WebGPUEncoderBuilder}
   */
  beginRenderPass(descriptor) {
    this.activePassEncoder = this.commandEncoder.beginRenderPass(descriptor);
    return this.proxy;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginComputePass|GPUCommandEncoder: beginComputePass() method}
   * @param {GPUComputePassDescriptor} [descriptor]
   * @returns {WebGPUEncoderBuilder}
   */
  beginComputePass(descriptor = {}) {
    this.activePassEncoder = this.commandEncoder.beginComputePass(descriptor);
    return this.proxy;
  }

  /**
   * @param {boolean} debug
   * @returns {WebGPUEncoderBuilder}
   */
  setDebug(debug) {
    this.debug = debug;
    return this.proxy;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/finish|GPUCommandEncoder: finish() method}
   * @returns {GPUCommandBuffer}
   */
  finish() {
    return this.commandEncoder.finish();
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/submit|GPUQueue: submit() method}
   * @returns {GPUQueue}
   */
  queueSubmit() {
    this.device.queue.submit([this.commandEncoder.finish()]);
    return this.device.queue;
  }
}
