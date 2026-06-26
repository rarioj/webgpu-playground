export class PipelineBuilder {
  /**
   * @type {GPUDevice}
   */
  device = null;

  /**
   * @type {GPUBindGroupLayout[]}
   */
  bindGroupLayouts = [];

  /**
   * @type {GPUPipelineLayout}
   */
  pipelineLayout = null;

  /**
   * @type {GPURenderPipeline|GPUComputePipeline}
   */
  pipeline = null;

  /**
   * @type {string}
   */
  pipelineLayoutLabel = "";

  /**
   * @type {string}
   */
  pipelineLabel = "";

  /**
   * @type {GPURenderPipelineDescriptor}
   */
  renderPipelineDescriptor = {};

  /**
   * @type {GPUComputePipelineDescriptor}
   */
  computePipelineDescriptor = {};

  /**
   * @param {GPUDevice} device
   */
  constructor(device, compute = false) {
    this.device = device;
  }

  /**
   * @param {GPUBindGroupLayout} bindGroupLayout
   * @returns {PipelineBuilder}
   */
  addBindGroupLayout(bindGroupLayout) {
    this.bindGroupLayouts.push(bindGroupLayout);
    return this;
  }

  /**
   * @param {GPUPipelineLayout} pipelineLayout
   * @returns {PipelineBuilder}
   */
  setPipelineLayout(pipelineLayout) {
    this.pipelineLayout = pipelineLayout;
    return this;
  }

  /**
   * @param {GPUShaderModule} module
   * @param {string} entryPoint
   * @param {Object} [options]
   * @returns {PipelineBuilder}
   */
  setVertexShader(module, entryPoint, options = {}) {
    this.renderPipelineDescriptor.vertex = { module, entryPoint, ...options };
    return this;
  }

  /**
   * @param {GPUShaderModule} module
   * @param {string} entryPoint
   * @param {Object} [options]
   * @returns {PipelineBuilder}
   */
  setFragmentShader(module, entryPoint, options = {}) {
    this.renderPipelineDescriptor.fragment = { module, entryPoint, ...options };
    return this;
  }

  /**
   * @param {GPUDepthStencilState} state
   * @returns {PipelineBuilder}
   */
  setDepthStencil(state) {
    this.renderPipelineDescriptor.depthStencil = state;
    return this;
  }

  /**
   * @param {GPUMultisampleState} state
   * @returns {PipelineBuilder}
   */
  setMultisample(state) {
    this.renderPipelineDescriptor.multisample = state;
    return this;
  }

  /**
   * @param {GPUPrimitiveState} state
   * @returns {PipelineBuilder}
   */
  setPrimitive(state) {
    this.renderPipelineDescriptor.primitive = state;
    return this;
  }

  /**
   * @param {GPUShaderModule} module
   * @param {string} entryPoint
   * @param {Object} [options]
   * @returns {PipelineBuilder}
   */
  setComputeShader(module, entryPoint, options = {}) {
    this.computePipelineDescriptor.compute = { module, entryPoint, ...options };
    return this;
  }

  /**
   * @param {string} label
   * @param {string} [layoutLabel]
   * @returns {PipelineBuilder}
   */
  setLabel(label, layoutLabel = "") {
    this.pipelineLabel = label;
    this.pipelineLayoutLabel = layoutLabel;
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createPipelineLayout|GPUDevice: createPipelineLayout() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline|GPUDevice: createRenderPipeline() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createComputePipeline|GPUDevice: createComputePipeline() method}
   * @returns {{pipelineLayout: GPUPipelineLayout, pipeline: GPURenderPipeline|GPUComputePipeline}}
   */
  build() {
    if (!(this.pipelineLayout instanceof GPUPipelineLayout)) {
      this.pipelineLayout = this.device.createPipelineLayout({
        label: this.pipelineLayoutLabel || "Pipeline layout",
        bindGroupLayouts: this.bindGroupLayouts,
      });
    }

    if (this.computePipelineDescriptor?.compute) {
      this.pipeline = this.device.createComputePipeline({
        ...this.computePipelineDescriptor,
        ...{ layout: this.pipelineLayout, label: this.pipelineLabel || "Compute pipeline" },
      });
    } else if (this.renderPipelineDescriptor?.vertex) {
      this.pipeline = this.device.createRenderPipeline({
        ...this.renderPipelineDescriptor,
        ...{ layout: this.pipelineLayout, label: this.pipelineLabel || "Render pipeline" },
      });
    } else {
      throw "Missing complete descriptor to generate pipeline object.";
    }

    return { pipelineLayout: this.pipelineLayout, pipeline: this.pipeline };
  }
}
