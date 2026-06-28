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
   * @type {Map.<string, GPUShaderModule>}
   */
  modules = null;

  /**
   * @param {GPUDevice} device
   */
  constructor(device) {
    this.device = device;
    this.modules = new Map();
  }

  /**
   * @param {string} moduleName
   * @param {string} code
   * @param {Objects} [options]
   * @param {string[][]} [options.replacements] Example: `[["fromThis", "toThat"], ["anotherThis", "anotherThat"]]`
   * @param {GPUShaderModuleDescriptor} [options.shaderModuleDescriptor] {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createShaderModule|GPUDevice: createShaderModule() method}
   * @returns {PipelineBuilder}
   */
  addShaderCode(moduleName, code, options = {}) {
    const { replacements = [], shaderModuleDescriptor = {} } = options;

    const defaultShaderModuleDescriptor = { label: moduleName, hints: {} };
    const finalCode = replacements.reduce((text, [from, to]) => {
      return text.replaceAll(from, to);
    }, code);
    const shaderModule = this.device.createShaderModule({ ...defaultShaderModuleDescriptor, ...{ code: finalCode }, ...shaderModuleDescriptor });

    this.modules.set(moduleName, shaderModule);
    return this;
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
   * @param {string} moduleName
   * @param {string} entryPoint
   * @param {Object} [options]
   * @returns {PipelineBuilder}
   */
  setVertexShader(moduleName, entryPoint, options = {}) {
    this.renderPipelineDescriptor.vertex = { module: this.modules.get(moduleName), entryPoint, ...options };
    return this;
  }

  /**
   * @param {string} moduleName
   * @param {string} entryPoint
   * @param {Object} [options]
   * @returns {PipelineBuilder}
   */
  setFragmentShader(moduleName, entryPoint, options = {}) {
    this.renderPipelineDescriptor.fragment = { module: this.modules.get(moduleName), entryPoint, ...options };
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
   * @param {string} moduleName
   * @param {string} entryPoint
   * @param {Object} [options]
   * @returns {PipelineBuilder}
   */
  setComputeShader(moduleName, entryPoint, options = {}) {
    this.computePipelineDescriptor.compute = { module: this.modules.get(moduleName), entryPoint, ...options };
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
