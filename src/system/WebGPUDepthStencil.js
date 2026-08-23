import { WebGPU } from "./WebGPU.js";
import { WebGPUTexture } from "./WebGPUTexture.js";

/**
 * @classdesc
 */
export class WebGPUDepthStencil {
  /**
   * @type {WebGPU}
   */
  webgpu;

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
   * @param {WebGPU} webgpu
   * @param {WebGPUTexture} textureBuilder
   */
  constructor(webgpu, textureBuilder) {
    this.webgpu = webgpu;
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
    this.textureBuilder.setTextureSize(width, height, depthOrArrayLayers);
    return this;
  }

  /**
   * @param {Object} [options]
   * @param {GPUTextureDescriptor} [options.overrideTextureDescriptor]
   * @param {GPUTextureViewDescriptor} [options.overrideTextureViewDescriptor]
   * @returns {WebGPUDepthStencil}
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
    return this;
  }
}
