/**
 * @classdesc
 */
export class WebGPUEncoder {
  /**
   * @type {boolean}
   */
  debug;

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
  passEncoder;

  /**
   * @type {WebGPUEncoder}
   */
  proxy;

  /**
   * @param {GPUDevice} device
   * @param {string} [label]
   */
  constructor(device, label = "Unlabelled") {
    this.debug = false;
    this.device = device;
    this.commandEncoder = this.device.createCommandEncoder({
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
   * @param {function} [callback]
   */
  submitCommandBuffer(callback = undefined) {
    this.device.queue.submit([this.commandEncoder.finish()]);
    if (callback) {
      this.device.queue.onSubmittedWorkDone().then(callback);
    }
    return this.device.queue;
  }
}
