import { WebGPU } from "./WebGPU.js";

/**
 * @classdesc
 */
export class WebGPUEncoder {
  /**
   * @type {WebGPU}
   */
  webgpu;

  /**
   * @type {GPUCommandEncoder}
   */
  commandEncoder;

  /**
   * @type {GPURenderPassEncoder|GPUComputePassEncoder}
   */
  passEncoder;

  /**
   * @type {WebGPUEncoder}
   */
  proxy;

  /**
   * @param {WebGPU} webgpu
   * @param {string} [label]
   */
  constructor(webgpu, label = "Unlabelled") {
    this.webgpu = webgpu;
    this.commandEncoder = this.webgpu.device.createCommandEncoder({
      label: `${label} (GPUCommandEncoder)`,
    });
    this.passEncoder = undefined;
    this.proxy = new Proxy(this, {
      get(target, property, receiver) {
        // Properties defined by WebGPUEncoder
        if (Reflect.has(target, property)) {
          const encoderProp = Reflect.get(target, property, receiver);
          if (typeof encoderProp === "function") {
            return encoderProp.bind(target);
          }
          return encoderProp;
        }

        // Properties defined by GPURenderPassEncoder or GPUComputePassEncoder
        if (target.passEncoder && Reflect.has(target.passEncoder, property)) {
          const passEncoderProp = Reflect.get(target.passEncoder, property, receiver);
          return function (...args) {
            const result = passEncoderProp.apply(target.passEncoder, args);
            if (property === "end") {
              target.passEncoder = undefined;
            }
            return target.proxy;
          };
        }

        // Properties defined by GPUCommandEncoder
        if (target.commandEncoder && Reflect.has(target.commandEncoder, property)) {
          const commandEncoderProp = Reflect.get(target.commandEncoder, property, receiver);
          return function (...args) {
            const result = commandEncoderProp.apply(target.commandEncoder, args);
            if (result instanceof GPUCommandBuffer) {
              return result;
            }
            if (result instanceof GPURenderPassEncoder || result instanceof GPUComputePassEncoder) {
              target.passEncoder = result;
            }
            return target.proxy;
          };
        }

        throw new Error(`Unable to resolve property name: ${property} to the proxy object`);
      },
    });

    return this.proxy;
  }

  /**
   * @param {function(): void} [callback]
   */
  submitCommandBuffer(callback = undefined) {
    this.webgpu.device.queue.submit([this.commandEncoder.finish()]);
    if (callback) {
      this.webgpu.device.queue.onSubmittedWorkDone().then(callback);
    }
    return this.webgpu.device.queue;
  }
}
