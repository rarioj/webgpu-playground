/**
 * @classdesc
 */
export class WebGPUPipeline {
  /**
   * @type {boolean}
   */
  debug;

  /**
   * @type {GPUDevice}
   */
  device;

  /**
   * @type {GPUShaderModule}
   */
  shaderModule;

  /**
   * @type {GPUPipelineLayoutDescriptor}
   */
  pipelineLayoutDescriptor;

  /**
   * @type {GPURenderPipelineDescriptor}
   */
  renderPipelineDescriptor;

  /**
   * @type {GPUComputePipelineDescriptor}
   */
  computePipelineDescriptor;

  /**
   * @type {GPURenderPipeline|GPUComputePipeline}
   */
  pipeline;

  /**
   * @param {GPUDevice} device
   * @param {string} [label]
   */
  constructor(device, label = "Unlabelled") {
    this.debug = false;
    this.device = device;
    this.shaderModule = undefined;
    this.pipelineLayoutDescriptor = {
      label: `${label} (GPUPipelineLayout)`,
      bindGroupLayouts: [],
    };
    this.renderPipelineDescriptor = {
      label: `${label} (GPURenderPipeline)`,
      layout: undefined,
      vertex: undefined,
      fragment: undefined,
    };
    this.computePipelineDescriptor = {
      label: `${label} (GPUComputePipeline)`,
      layout: undefined,
      compute: undefined,
    };
    this.pipeline = undefined;
  }

  /**
   * @param {GPUPipelineLayout} pipelineLayout
   * @returns {WebGPUPipeline}
   */
  setLayout(pipelineLayout) {
    this.renderPipelineDescriptor.layout = pipelineLayout;
    this.computePipelineDescriptor.layout = pipelineLayout;
    return this;
  }

  /**
   * @param {GPUBindGroupLayout} bindGroupLayout
   * @returns {WebGPUPipeline}
   */
  addBindGroupLayout(bindGroupLayout) {
    this.pipelineLayoutDescriptor.bindGroupLayouts.push(bindGroupLayout);
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createShaderModule|GPUDevice: createShaderModule() method}
   * @param {string} code
   * @param {string[][]} [replacements] Example: `[["fromThis", "toThat"], ["fromAnotherThis", "toAnotherThat"]]`
   * @param {GPUShaderModuleDescriptor} [shaderModuleDescriptor]
   * @returns {WebGPUPipeline}
   */
  useShaderCode(code, replacements = [], shaderModuleDescriptor = {}) {
    const finalCode = replacements.reduce((text, [from, to]) => {
      return text.replaceAll(from, to);
    }, code);

    /** @type {GPUShaderModuleDescriptor} */
    const finalShaderModuleDescriptor = { ...{ code: finalCode }, ...shaderModuleDescriptor };
    this.debug && console.debug("GPUShaderModuleDescriptor", finalShaderModuleDescriptor);
    this.shaderModule = this.device.createShaderModule(finalShaderModuleDescriptor);

    return this;
  }

  /**
   * @param {GPUVertexState} vertexState
   * @returns {WebGPUPipeline}
   */
  setVertexShader(vertexState) {
    this.renderPipelineDescriptor.vertex = { ...{ module: this.shaderModule }, ...vertexState };
    return this;
  }

  /**
   * @param {GPUFragmentState} fragmentState
   * @returns {WebGPUPipeline}
   */
  setFragmentShader(fragmentState) {
    this.renderPipelineDescriptor.fragment = { ...{ module: this.shaderModule }, ...fragmentState };
    return this;
  }

  /**
   * @param {GPUProgrammableStage} programmableStage
   * @returns {WebGPUPipeline}
   */
  setComputeShader(programmableStage) {
    this.computePipelineDescriptor.compute = { ...{ module: this.shaderModule }, ...programmableStage };
    return this;
  }

  /**
   * @param {GPUDepthStencilState} depthStencilState
   * @returns {WebGPUPipeline}
   */
  setRenderDepthStencil(depthStencilState) {
    this.renderPipelineDescriptor.depthStencil = depthStencilState;
    return this;
  }

  /**
   * @param {GPUMultisampleState} multisampleState
   * @returns {WebGPUPipeline}
   */
  setRenderMultisample(multisampleState) {
    this.renderPipelineDescriptor.multisample = multisampleState;
    return this;
  }

  /**
   * @param {GPUPrimitiveState} primitiveState
   * @returns {WebGPUPipeline}
   */
  setRenderPrimitive(primitiveState) {
    this.renderPipelineDescriptor.primitive = primitiveState;
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createPipelineLayout|GPUDevice: createPipelineLayout() method}
   * @param {GPUPipelineLayoutDescriptor} [overridePipelineLayoutDescriptor]
   */
  createPipelineLayout(overridePipelineLayoutDescriptor = {}) {
    if (!this.renderPipelineDescriptor.layout && !this.computePipelineDescriptor.layout) {
      /** @type {GPUPipelineLayoutDescriptor} */
      const finalPipelineLayoutDescriptor = { ...this.pipelineLayoutDescriptor, ...overridePipelineLayoutDescriptor };
      this.debug && console.debug("GPUPipelineLayoutDescriptor", finalPipelineLayoutDescriptor);

      const pipelineLayout = this.device.createPipelineLayout(finalPipelineLayoutDescriptor);
      this.renderPipelineDescriptor.layout = pipelineLayout;
      this.computePipelineDescriptor.layout = pipelineLayout;
    }
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline|GPUDevice: createRenderPipeline() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createComputePipeline|GPUDevice: createComputePipeline() method}
   * @param {Object} [options]
   * @param {GPUPipelineLayoutDescriptor} [options.overridePipelineLayoutDescriptor]
   * @param {GPURenderPipelineDescriptor} [options.overrideRenderPipelineDescriptor]
   * @param {GPUComputePipelineDescriptor} [options.overrideComputePipelineDescriptor]
   * @returns {{builder: WebGPUPipeline, pipelineLayout: GPUPipelineLayout, pipeline: GPURenderPipeline|GPUComputePipeline}}
   */
  build(options = {}) {
    const { overridePipelineLayoutDescriptor = {}, overrideRenderPipelineDescriptor = {}, overrideComputePipelineDescriptor = {} } = options;
    this.createPipelineLayout(overridePipelineLayoutDescriptor);

    if (this.renderPipelineDescriptor?.vertex) {
      /** @type {GPURenderPipelineDescriptor} */
      const finalRenderPipelineDescriptor = { ...this.renderPipelineDescriptor, ...overrideRenderPipelineDescriptor };
      this.debug && console.debug("GPURenderPipelineDescriptor", finalRenderPipelineDescriptor);
      this.pipeline = this.device.createRenderPipeline(finalRenderPipelineDescriptor);

      return { builder: this, pipelineLayout: this.renderPipelineDescriptor.layout, pipeline: this.pipeline };
    } else if (this.computePipelineDescriptor?.compute) {
      /** @type {GPUComputePipelineDescriptor} */
      const finalComputePipelineDescriptor = { ...this.computePipelineDescriptor, ...overrideComputePipelineDescriptor };
      this.debug && console.debug("GPUComputePipelineDescriptor", finalComputePipelineDescriptor);
      this.pipeline = this.device.createComputePipeline(finalComputePipelineDescriptor);

      return { builder: this, pipelineLayout: this.computePipelineDescriptor.layout, pipeline: this.pipeline };
    } else {
      throw new Error("Unable to create a GPU pipeline object due to invalid/incomplete descriptor");
    }
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipelineAsync|GPUDevice: createRenderPipelineAsync() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createComputePipelineAsync|GPUDevice: createComputePipelineAsync() method}
   * @param {Object} [options]
   * @param {GPUPipelineLayoutDescriptor} [options.overridePipelineLayoutDescriptor]
   * @param {GPURenderPipelineDescriptor} [options.overrideRenderPipelineDescriptor]
   * @param {GPUComputePipelineDescriptor} [options.overrideComputePipelineDescriptor]
   * @returns {{builder: WebGPUPipeline, pipelineLayout: GPUPipelineLayout, pipeline: GPURenderPipeline|GPUComputePipeline}}
   */
  async buildAsync(options = {}) {
    const { overridePipelineLayoutDescriptor = {}, overrideRenderPipelineDescriptor = {}, overrideComputePipelineDescriptor = {} } = options;
    this.createPipelineLayout(overridePipelineLayoutDescriptor);

    if (this.renderPipelineDescriptor?.vertex) {
      /** @type {GPURenderPipelineDescriptor} */
      const finalRenderPipelineDescriptor = { ...this.renderPipelineDescriptor, ...overrideRenderPipelineDescriptor };
      this.debug && console.debug("GPURenderPipelineDescriptor", finalRenderPipelineDescriptor);
      this.pipeline = await this.device.createRenderPipelineAsync(finalRenderPipelineDescriptor);

      return { builder: this, pipelineLayout: this.renderPipelineDescriptor.layout, pipeline: this.pipeline };
    } else if (this.computePipelineDescriptor?.compute) {
      /** @type {GPUComputePipelineDescriptor} */
      const finalComputePipelineDescriptor = { ...this.computePipelineDescriptor, ...overrideComputePipelineDescriptor };
      this.debug && console.debug("GPUComputePipelineDescriptor", finalComputePipelineDescriptor);
      this.pipeline = await this.device.createComputePipelineAsync(finalComputePipelineDescriptor);

      return { builder: this, pipelineLayout: this.computePipelineDescriptor.layout, pipeline: this.pipeline };
    } else {
      throw new Error("Unable to create a GPU pipeline object due to invalid/incomplete descriptor");
    }
  }
}
