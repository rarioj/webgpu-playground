/**
 * @classdesc
 */
export class BindGroupBuilder {
  /**
   * @type {GPUDevice}
   */
  device = null;

  /**
   * @type {number}
   */
  binding = 0;

  /**
   * @type {GPUBindGroupLayout}
   */
  bindGroupLayout = null;

  /**
   * @type {GPUBindGroup}
   */
  bindGroup = null;

  /**
   * @type {GPUBindGroupLayoutEntry[]}
   */
  bindGroupLayoutEntries = [];

  /**
   * @type {GPUBindGroupEntry[]}
   */
  bindGroupEntries = [];

  /**
   * @type {string}
   */
  bindGroupLayoutLabel = "";

  /**
   * @type {string}
   */
  bindGroupLabel = "";

  /**
   * @param {GPUDevice} device
   */
  constructor(device) {
    this.device = device;
  }

  /**
   * @param {GPUBindGroupLayout} layout
   * @returns {BindGroupBuilder}
   */
  setLayout(layout) {
    this.bindGroupLayout = layout;
    return this;
  }

  /**
   * @param {string} label
   * @param {string} [layoutLabel]
   * @returns {BindGroupBuilder}
   */
  setLabel(label, layoutLabel = "") {
    this.bindGroupLabel = label;
    this.bindGroupLayoutLabel = layoutLabel || `${label} layout`;
    return this;
  }

  /**
   * @param {GPUBindingResource} resource
   * @param {GPUBindGroupLayoutEntry} [layoutEntry]
   * @returns {BindGroupBuilder}
   */
  addEntry(resource, layoutEntry = {}) {
    if (!(this.bindGroupLayout instanceof GPUBindGroupLayout)) {
      this.bindGroupLayoutEntries.push({ ...layoutEntry, ...{ binding: this.binding } });
    }
    this.bindGroupEntries.push({ binding: this.binding, resource });
    this.binding++;
    return this;
  }

  /**
   * @param {GPUBuffer} resource
   * @param {number} visibility
   * @param {GPUBufferBindingLayout} [options]
   * @returns {BindGroupBuilder}
   */
  addBuffer(resource, visibility, options = {}) {
    return this.addEntry({ buffer: resource }, { visibility, buffer: options });
  }

  /**
   * @param {GPUTexture} resource
   * @param {number} visibility
   * @param {GPUTextureBindingLayout} [options]
   * @returns {BindGroupBuilder}
   */
  addTexture(resource, visibility, options = {}) {
    return this.addEntry(resource, { visibility, texture: options });
  }

  /**
   * @param {GPUSampler} resource
   * @param {number} visibility
   * @param {GPUSamplerBindingLayout} [options]
   * @returns {BindGroupBuilder}
   */
  addSampler(resource, visibility, options = {}) {
    return this.addEntry(resource, { visibility, sampler: options });
  }

  /**
   * @param {GPUExternalTexture} resource
   * @param {number} visibility
   * @param {GPUExternalTextureBindingLayout} [options]
   * @returns {BindGroupBuilder}
   */
  addExternalTexture(resource, visibility, options = {}) {
    return this.addEntry(resource, { visibility, externalTexture: options });
  }

  /**
   * @param {GPUTexture} resource
   * @param {number} visibility
   * @param {GPUStorageTextureBindingLayout} [options]
   * @returns {BindGroupBuilder}
   */
  addStorageTexture(resource, visibility, options = {}) {
    return this.addEntry(resource, { visibility, storageTexture: options });
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroupLayout|GPUDevice: createBindGroupLayout() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroup|GPUDevice: createBindGroup() method}
   * @returns {{bindGroupLayout: GPUBindGroupLayout, bindGroup: GPUBindGroup}}
   */
  build() {
    if (!(this.bindGroupLayout instanceof GPUBindGroupLayout)) {
      this.bindGroupLayout = this.device.createBindGroupLayout({
        label: this.bindGroupLayoutLabel || "Bind group layout",
        entries: this.bindGroupLayoutEntries,
      });
    }
    this.bindGroup = this.device.createBindGroup({
      label: this.bindGroupLabel || "Bind group",
      layout: this.bindGroupLayout,
      entries: this.bindGroupEntries,
    });

    return { bindGroupLayout: this.bindGroupLayout, bindGroup: this.bindGroup };
  }
}
