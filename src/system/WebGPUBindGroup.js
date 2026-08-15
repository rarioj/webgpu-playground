/**
 * @classdesc
 */
export class WebGPUBindGroup {
  /**
   * @type {boolean}
   */
  debug;

  /**
   * @type {GPUDevice}
   */
  device;

  /**
   * @type {GPUBindGroupLayoutDescriptor}
   */
  bindGroupLayoutDescriptor;

  /**
   * @type {GPUBindGroupDescriptor}
   */
  bindGroupDescriptor;

  /**
   * @type {GPUBindGroup}
   */
  bindGroup;

  /**
   * @param {GPUDevice} device
   * @param {string} [label]
   */
  constructor(device, label = "Unlabelled") {
    this.debug = false;
    this.device = device;
    this.bindGroupLayoutDescriptor = {
      label: `${label} (GPUBindGroupLayout)`,
      entries: [],
    };
    this.bindGroupDescriptor = {
      label: `${label} (GPUBindGroup)`,
      layout: undefined,
      entries: [],
    };
    this.bindGroup = undefined;
  }

  /**
   * @param {GPUBindGroupLayout} bindGroupLayout
   * @returns {WebGPUBindGroup}
   */
  setLayout(bindGroupLayout) {
    this.bindGroupDescriptor.layout = bindGroupLayout;
    return this;
  }

  /**
   * @param {number} index
   * @param {GPUBindingResource} resource
   * @returns {WebGPUBindGroup}
   */
  setResource(index, resource) {
    this.bindGroupDescriptor.entries[index].resource = resource;
    return this;
  }

  /**
   * @param {GPUBindingResource} bindingResource
   * @param {GPUBindGroupLayoutEntry} [bindGroupLayoutEntry]
   * @returns {WebGPUBindGroup}
   */
  addEntry(bindingResource, bindGroupLayoutEntry = {}) {
    if (!(this.bindGroupDescriptor.layout instanceof GPUBindGroupLayout)) {
      this.bindGroupLayoutDescriptor.entries.push({ ...{ binding: this.bindGroupLayoutDescriptor.entries.length }, ...bindGroupLayoutEntry });
    }
    this.bindGroupDescriptor.entries.push({ binding: this.bindGroupDescriptor.entries.length, resource: bindingResource });
    return this;
  }

  /**
   * @param {GPUBuffer} buffer
   * @param {GPUShaderStageFlags} shaderStageFlags
   * @param {GPUBufferBindingLayout} [bufferBindingLayout]
   * @returns {WebGPUBindGroup}
   */
  addBuffer(buffer, shaderStageFlags, bufferBindingLayout = {}) {
    return this.addEntry({ buffer }, { visibility: shaderStageFlags, buffer: bufferBindingLayout });
  }

  /**
   * @param {GPUTexture} texture
   * @param {GPUShaderStageFlags} shaderStageFlags
   * @param {GPUTextureBindingLayout} [textureBindingLayout]
   * @returns {WebGPUBindGroup}
   */
  addTexture(texture, shaderStageFlags, textureBindingLayout = {}) {
    return this.addEntry(texture, { visibility: shaderStageFlags, texture: textureBindingLayout });
  }

  /**
   * @param {GPUSampler} sampler
   * @param {GPUShaderStageFlags} shaderStageFlags
   * @param {GPUSamplerBindingLayout} [samplerBindingLayout]
   * @returns {WebGPUBindGroup}
   */
  addSampler(sampler, shaderStageFlags, samplerBindingLayout = {}) {
    return this.addEntry(sampler, { visibility: shaderStageFlags, sampler: samplerBindingLayout });
  }

  /**
   * @param {GPUExternalTexture} externalTexture
   * @param {GPUShaderStageFlags} shaderStageFlags
   * @param {GPUExternalTextureBindingLayout} [externalTextureBindingLayout]
   * @returns {WebGPUBindGroup}
   */
  addExternalTexture(externalTexture, shaderStageFlags, externalTextureBindingLayout = {}) {
    return this.addEntry(externalTexture, { visibility: shaderStageFlags, externalTexture: externalTextureBindingLayout });
  }

  /**
   * @param {GPUTexture} texture
   * @param {GPUShaderStageFlags} shaderStageFlags
   * @param {GPUStorageTextureBindingLayout} [storageTextureBindingLayout]
   * @returns {WebGPUBindGroup}
   */
  addStorageTexture(texture, shaderStageFlags, storageTextureBindingLayout = {}) {
    return this.addEntry(texture, { visibility: shaderStageFlags, storageTexture: storageTextureBindingLayout });
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroupLayout|GPUDevice: createBindGroupLayout() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroup|GPUDevice: createBindGroup() method}
   * @param {Object} [options]
   * @param {GPUBindGroupLayoutDescriptor} [options.overrideBindGroupLayoutDescriptor]
   * @param {GPUBindGroupDescriptor} [options.overrideBindGroupDescriptor]
   * @returns {{builder: WebGPUBindGroup, bindGroupLayout: GPUBindGroupLayout, bindGroup: GPUBindGroup}}
   */
  build(options = {}) {
    const { overrideBindGroupLayoutDescriptor = {}, overrideBindGroupDescriptor = {} } = options;

    if (!this.bindGroupDescriptor.layout) {
      /** @type {GPUBindGroupLayoutDescriptor} */
      const finalBindGroupLayoutDescriptor = { ...this.bindGroupLayoutDescriptor, ...overrideBindGroupLayoutDescriptor };
      this.debug && console.debug("GPUBindGroupLayoutDescriptor", finalBindGroupLayoutDescriptor);
      this.bindGroupDescriptor.layout = this.device.createBindGroupLayout(finalBindGroupLayoutDescriptor);
    }

    /** @type {GPUBindGroupDescriptor} */
    const finalBindGroupDescriptor = { ...this.bindGroupDescriptor, ...overrideBindGroupDescriptor };
    this.debug && console.debug("GPUBindGroupDescriptor", finalBindGroupDescriptor);
    this.bindGroup = this.device.createBindGroup(finalBindGroupDescriptor);

    return { builder: this, bindGroupLayout: this.bindGroupDescriptor.layout, bindGroup: this.bindGroup };
  }
}
