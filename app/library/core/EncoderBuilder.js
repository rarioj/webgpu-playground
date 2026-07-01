/**
 * @classdesc
 */
export class EncoderBuilder {
  /**
   * @type {GPUDevice}
   */
  device = null;

  /**
   * @type {GPUCommandEncoder}
   */
  commandEncoder = null;

  /**
   * @type {GPURenderPassEncoder|GPUComputePassEncoder}
   */
  activePassEncoder = null;

  /**
   * @type {EncoderBuilder}
   */
  proxy = null;

  /**
   * @param {GPUDevice} device
   * @param {string} [label]
   */
  constructor(device, label = "") {
    this.device = device;
    this.commandEncoder = this.device.createCommandEncoder({
      label: label || "Default command encoder",
    });

    this.proxy = new Proxy(this, {
      get(target, property, receiver) {
        if (property in target) {
          const builderValue = target[property];
          if (typeof builderValue === "function") {
            return builderValue.bind(target);
          }
          return builderValue;
        }
        const activePass = target.activePassEncoder;
        if (typeof activePass[property] === "function") {
          return function (...args) {
            const result = activePass[property].apply(activePass, args);
            return target.proxy;
          };
        }
        return activePass[property];
      },
    });

    return this.proxy;
  }

  /**
   * @param {GPUBuffer} buffer
   * @param {number} bufferOffset
   * @param {Int32Array|Uint32Array|Float32Array} data
   * @param {number} [dataOffset]
   * @param {number} [size]
   * @returns {EncoderBuilder}
   */
  queueBuffer(buffer, bufferOffset, data, dataOffset = 0, size = 0) {
    if (size) {
      this.device.queue.writeBuffer(buffer, bufferOffset, data, dataOffset, size);
    } else {
      this.device.queue.writeBuffer(buffer, bufferOffset, data, dataOffset);
    }
    return this.proxy;
  }

  /**
   * @param {GPURenderPassDescriptor} descriptor
   * @returns {EncoderBuilder}
   */
  beginRenderPass(descriptor) {
    this.activePassEncoder = this.commandEncoder.beginRenderPass(descriptor);
    return this.proxy;
  }

  /**
   * @param {GPUComputePassDescriptor} [descriptor]
   * @returns {EncoderBuilder}
   */
  beginComputePass(descriptor = {}) {
    this.activePassEncoder = this.commandEncoder.beginComputePass(descriptor);
    return this.proxy;
  }

  /**
   * @returns {GPUCommandBuffer}
   */
  finish() {
    return this.commandEncoder.finish();
  }

  /**
   *
   */
  submit() {
    this.device.queue.submit([this.commandEncoder.finish()]);
  }
}
