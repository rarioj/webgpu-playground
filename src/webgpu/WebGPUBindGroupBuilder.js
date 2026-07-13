/**
 * @classdesc
 */
export class WebGPUBindGroupBuilder {
  /**
   * @type {GPUDevice}
   */
  device;

  /**
   * @type {number}
   */
  binding;

  /**
   * @type {GPUBindGroupLayout}
   */
  bindGroupLayout;

  /**
   * @type {GPUBindGroup}
   */
  bindGroup;

  /**
   * @type {GPUBindGroupLayoutEntry[]}
   */
  bindGroupLayoutEntries;

  /**
   * @type {GPUBindGroupEntry[]}
   */
  bindGroupEntries;

  /**
   * @type {string}
   */
  bindGroupLayoutLabel;

  /**
   * @type {string}
   */
  bindGroupLabel;

  /**
   * @type {boolean}
   */
  debug;

  /**
   * @param {GPUDevice} device
   */
  constructor(device) {
    this.device = device;
    this.binding = 0;
    this.bindGroupLayoutEntries = [];
    this.bindGroupEntries = [];
    this.bindGroupLayoutLabel = "";
    this.bindGroupLabel = "";
    this.debug = false;
  }

  /**
   * @param {GPUBindGroupLayout} layout
   * @returns {WebGPUBindGroupBuilder}
   */
  setLayout(layout) {
    this.bindGroupLayout = layout;
    return this;
  }

  /**
   * @param {string} label
   * @param {string} [layoutLabel]
   * @returns {WebGPUBindGroupBuilder}
   */
  setLabel(label, layoutLabel = "") {
    this.bindGroupLabel = label;
    if (layoutLabel) {
      this.bindGroupLayoutLabel = layoutLabel;
    }
    return this;
  }

  /**
   * @param {GPUBindingResource} resource
   * @param {GPUBindGroupLayoutEntry} [layoutEntry]
   * @returns {WebGPUBindGroupBuilder}
   */
  #addEntry(resource, layoutEntry = {}) {
    if (!(this.bindGroupLayout instanceof GPUBindGroupLayout)) {
      this.bindGroupLayoutEntries.push({ ...layoutEntry, ...{ binding: this.binding } });
    }
    this.bindGroupEntries.push({ binding: this.binding, resource });
    this.binding++;
    return this;
  }

  /**
   * @param {GPUBuffer} resource
   * @param {GPUShaderStageFlags} visibility
   * @param {GPUBufferBindingLayout} [options]
   * @returns {WebGPUBindGroupBuilder}
   */
  addBuffer(resource, visibility, options = {}) {
    return this.#addEntry({ buffer: resource }, { visibility, buffer: options });
  }

  /**
   * @param {GPUTexture} resource
   * @param {GPUShaderStageFlags} visibility
   * @param {GPUTextureBindingLayout} [options]
   * @returns {WebGPUBindGroupBuilder}
   */
  addTexture(resource, visibility, options = {}) {
    return this.#addEntry(resource, { visibility, texture: options });
  }

  /**
   * @param {GPUSampler} resource
   * @param {GPUShaderStageFlags} visibility
   * @param {GPUSamplerBindingLayout} [options]
   * @returns {WebGPUBindGroupBuilder}
   */
  addSampler(resource, visibility, options = {}) {
    return this.#addEntry(resource, { visibility, sampler: options });
  }

  /**
   * @param {GPUExternalTexture} resource
   * @param {GPUShaderStageFlags} visibility
   * @param {GPUExternalTextureBindingLayout} [options]
   * @returns {WebGPUBindGroupBuilder}
   */
  addExternalTexture(resource, visibility, options = {}) {
    return this.#addEntry(resource, { visibility, externalTexture: options });
  }

  /**
   * @param {GPUTexture} resource
   * @param {GPUShaderStageFlags} visibility
   * @param {GPUStorageTextureBindingLayout} [options]
   * @returns {WebGPUBindGroupBuilder}
   */
  addStorageTexture(resource, visibility, options = {}) {
    return this.#addEntry(resource, { visibility, storageTexture: options });
  }

  /**
   * @param {boolean} debug
   * @returns {WebGPUBindGroupBuilder}
   */
  setDebug(debug) {
    this.debug = debug;
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroupLayout|GPUDevice: createBindGroupLayout() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroup|GPUDevice: createBindGroup() method}
   * @returns {{bindGroupLayout: GPUBindGroupLayout, bindGroup: GPUBindGroup}}
   */
  build() {
    this.build.bindGroupLayoutCounter = this.build.bindGroupLayoutCounter || 0;
    this.build.bindGroupCounter = this.build.bindGroupCounter || 0;

    if (!(this.bindGroupLayout instanceof GPUBindGroupLayout)) {
      /** @type {GPUBindGroupLayoutDescriptor} */
      const bindGroupLayoutDescriptor = {
        label: this.bindGroupLayoutLabel || `Bind group layout #${this.build.bindGroupLayoutCounter++}`,
        entries: this.bindGroupLayoutEntries,
      };
      if (this.debug) {
        console.debug("GPUBindGroupLayoutDescriptor", bindGroupLayoutDescriptor);
      }
      this.bindGroupLayout = this.device.createBindGroupLayout(bindGroupLayoutDescriptor);
    }

    /** @type {GPUBindGroupDescriptor} */
    const bindGroupDescriptor = {
      label: this.bindGroupLabel || `Bind group #${this.build.bindGroupCounter++}`,
      layout: this.bindGroupLayout,
      entries: this.bindGroupEntries,
    };
    if (this.debug) {
      console.debug("GPUBindGroupDescriptor", bindGroupDescriptor);
    }
    this.bindGroup = this.device.createBindGroup(bindGroupDescriptor);

    return { bindGroupLayout: this.bindGroupLayout, bindGroup: this.bindGroup };
  }
}
