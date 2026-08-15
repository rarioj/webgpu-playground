import { WebGPUTexture } from "./WebGPUTexture.js";

/**
 * @classdesc
 */
export class WebGPUDepthStencil {
  /**
   * @type {boolean}
   */
  debug;

  /**
   * @type {GPUDevice}
   */
  device;

  /**
   * @type {WebGPUTexture}
   */
  textureBuilder;

  /**
   * @type {GPUDepthStencilState}
   */
  state;

  /**
   * @type {GPURenderPassDepthStencilAttachment}
   */
  attachment;

  /**
   * @param {GPUDevice} device
   * @param {WebGPUTexture} textureBuilder
   */
  constructor(device, textureBuilder) {
    this.debug = false;
    this.device = device;
    this.textureBuilder = textureBuilder;
    this.state = undefined;
    this.attachment = undefined;
  }

  /**
   * @param {number} width
   * @param {number} height
   * @param {number} [depthOrArrayLayers]
   * @returns {WebGPUDepthStencil}
   */
  setTextureSize(width, height, depthOrArrayLayers = 1) {
    this.textureBuilder.textureDescriptor.size.width = width;
    this.textureBuilder.textureDescriptor.size.height = height;
    this.textureBuilder.textureDescriptor.size.depthOrArrayLayers = depthOrArrayLayers;
    return this;
  }

  /**
   * @param {Object} [options]
   * @param {GPUTextureDescriptor} [options.overrideTextureDescriptor]
   * @param {GPUTextureViewDescriptor} [options.overrideTextureViewDescriptor]
   * @returns {{builder: WebGPUDepthStencil, texture: GPUTexture, textureView: GPUTextureView, state: GPUDepthStencilState, attachment: GPURenderPassDepthStencilAttachment}}
   */
  build(options = {}) {
    const { overrideTextureDescriptor = {}, overrideTextureViewDescriptor = {} } = options;

    this.textureBuilder
      .setTextureFormat("depth24plus-stencil8")
      .setTextureUsage(GPUTextureUsage.RENDER_ATTACHMENT)
      .build({ createSampler: false, overrideTextureDescriptor, overrideTextureViewDescriptor });

    this.state = this.state || {
      depthCompare: "less-equal",
      depthWriteEnabled: true,
      format: this.textureBuilder.textureDescriptor.format,
    };

    this.attachment = this.attachment || {
      view: undefined,
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
      stencilLoadOp: "clear",
      stencilStoreOp: "discard",
    };

    this.attachment.view = this.textureBuilder.textureView;

    return {
      builder: this,
      texture: this.textureBuilder.texture,
      textureView: this.textureBuilder.textureView,
      state: this.state,
      attachment: this.attachment,
    };
  }
}
