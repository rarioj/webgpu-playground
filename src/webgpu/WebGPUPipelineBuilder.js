/**
 * @classdesc
 */
export class WebGPUPipelineBuilder {
  /**
   * @type {GPUDevice}
   */
  device;

  /**
   * @type {GPUBindGroupLayout[]}
   */
  bindGroupLayouts;

  /**
   * @type {GPUPipelineLayout}
   */
  pipelineLayout;

  /**
   * @type {GPURenderPipeline|GPUComputePipeline}
   */
  pipeline;

  /**
   * @type {string}
   */
  pipelineLayoutLabel;

  /**
   * @type {string}
   */
  pipelineLabel;

  /**
   * @type {GPURenderPipelineDescriptor}
   */
  renderPipelineDescriptor;

  /**
   * @type {GPUComputePipelineDescriptor}
   */
  computePipelineDescriptor;

  /**
   * @type {GPUShaderModule}
   */
  activeShaderModule;

  /**
   * @type {boolean}
   */
  debug;

  /**
   * @param {GPUDevice} device
   */
  constructor(device) {
    this.device = device;
    this.bindGroupLayouts = [];
    this.pipelineLayoutLabel = "";
    this.pipelineLabel = "";
    this.renderPipelineDescriptor = {};
    this.computePipelineDescriptor = {};
    this.debug = false;
  }

  /**
   * @param {string} label
   * @param {string} [layoutLabel]
   * @returns {WebGPUPipelineBuilder}
   */
  setLabel(label, layoutLabel = "") {
    this.pipelineLabel = label;
    if (layoutLabel) {
      this.pipelineLayoutLabel = layoutLabel;
    }
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createShaderModule|GPUDevice: createShaderModule() method}
   * @param {string} code
   * @param {Object} [options]
   * @param {string[][]} [options.replacements] Example: `[["fromThis", "toThat"], ["anotherThis", "anotherThat"]]`
   * @param {GPUShaderModuleDescriptor} [options.shaderModuleDescriptor]
   * @returns {WebGPUPipelineBuilder}
   */
  setShaderCode(code, options = {}) {
    const { replacements = [], shaderModuleDescriptor = {} } = options;

    this.setShaderCode.moduleCounter = this.setShaderCode.moduleCounter || 0;

    /** @type {GPUShaderModuleDescriptor} */
    const defaultShaderModuleDescriptor = {
      code: "",
      label: `Shader module #${this.setShaderCode.moduleCounter++}`,
      hints: {},
    };

    const finalCode = replacements.reduce((text, [from, to]) => {
      return text.replaceAll(from, to);
    }, code);

    /** @type {GPUShaderModuleDescriptor} */
    const finalShaderModuleDescriptor = { ...defaultShaderModuleDescriptor, ...{ code: finalCode }, ...shaderModuleDescriptor };
    if (this.debug) {
      console.debug("GPUShaderModuleDescriptor", finalShaderModuleDescriptor);
    }
    this.activeShaderModule = this.device.createShaderModule(finalShaderModuleDescriptor);

    return this;
  }

  /**
   * @param {GPUBindGroupLayout} bindGroupLayout
   * @returns {WebGPUPipelineBuilder}
   */
  addBindGroupLayout(bindGroupLayout) {
    this.bindGroupLayouts.push(bindGroupLayout);
    return this;
  }

  /**
   * @param {GPUPipelineLayout} pipelineLayout
   * @returns {WebGPUPipelineBuilder}
   */
  setLayout(pipelineLayout) {
    this.pipelineLayout = pipelineLayout;
    return this;
  }

  /**
   * @param {string} entryPoint
   * @param {GPUVertexState} [options]
   * @returns {WebGPUPipelineBuilder}
   */
  setVertexShader(entryPoint, options = {}) {
    this.renderPipelineDescriptor.vertex = { module: this.activeShaderModule, entryPoint, ...options };
    return this;
  }

  /**
   * @param {string} entryPoint
   * @param {GPUFragmentState} [options]
   * @returns {WebGPUPipelineBuilder}
   */
  setFragmentShader(entryPoint, options = {}) {
    this.renderPipelineDescriptor.fragment = { module: this.activeShaderModule, entryPoint, ...options };
    return this;
  }

  /**
   * @param {GPUDepthStencilState} state
   * @returns {WebGPUPipelineBuilder}
   */
  setDepthStencil(state) {
    this.renderPipelineDescriptor.depthStencil = state;
    return this;
  }

  /**
   * @param {GPUMultisampleState} state
   * @returns {WebGPUPipelineBuilder}
   */
  setMultisample(state) {
    this.renderPipelineDescriptor.multisample = state;
    return this;
  }

  /**
   * @param {GPUPrimitiveState} state
   * @returns {WebGPUPipelineBuilder}
   */
  setPrimitive(state) {
    this.renderPipelineDescriptor.primitive = state;
    return this;
  }

  /**
   * @param {string} entryPoint
   * @param {GPUProgrammableStage} [options]
   * @returns {WebGPUPipelineBuilder}
   */
  setComputeShader(entryPoint, options = {}) {
    this.computePipelineDescriptor.compute = { module: this.activeShaderModule, entryPoint, ...options };
    return this;
  }

  /**
   * @param {boolean} debug
   * @returns {WebGPUPipelineBuilder}
   */
  setDebug(debug) {
    this.debug = debug;
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createPipelineLayout|GPUDevice: createPipelineLayout() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline|GPUDevice: createRenderPipeline() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createComputePipeline|GPUDevice: createComputePipeline() method}
   * @returns {{pipelineLayout: GPUPipelineLayout, pipeline: GPURenderPipeline|GPUComputePipeline}}
   */
  build() {
    this.build.pipelineLayoutCounter = this.build.pipelineLayoutCounter || 0;
    this.build.computePipelineCounter = this.build.computePipelineCounter || 0;
    this.build.renderPipelineCounter = this.build.renderPipelineCounter || 0;

    if (!(this.pipelineLayout instanceof GPUPipelineLayout)) {
      /** @type {GPUPipelineLayoutDescriptor} */
      const pipelineLayoutDescriptor = {
        label: this.pipelineLayoutLabel || `Pipeline layout #${this.build.pipelineLayoutCounter++}`,
        bindGroupLayouts: this.bindGroupLayouts,
      };
      if (this.debug) {
        console.debug("GPUPipelineLayoutDescriptor", pipelineLayoutDescriptor);
      }
      this.pipelineLayout = this.device.createPipelineLayout(pipelineLayoutDescriptor);
    }

    if (this.computePipelineDescriptor?.compute) {
      /** @type {GPUComputePipelineDescriptor} */
      const computePipelineDescriptor = {
        ...this.computePipelineDescriptor,
        ...{ layout: this.pipelineLayout, label: this.pipelineLabel || `Compute pipeline #${this.build.computePipelineCounter++}` },
      };
      if (this.debug) {
        console.debug("GPUComputePipelineDescriptor", computePipelineDescriptor);
      }
      this.pipeline = this.device.createComputePipeline(computePipelineDescriptor);
    } else if (this.renderPipelineDescriptor?.vertex) {
      /** @type {GPURenderPipelineDescriptor} */
      const renderPipelineDescriptor = {
        ...this.renderPipelineDescriptor,
        ...{ layout: this.pipelineLayout, label: this.pipelineLabel || `Render pipeline #${this.build.renderPipelineCounter++}` },
      };
      if (this.debug) {
        console.debug("GPURenderPipelineDescriptor", renderPipelineDescriptor);
      }
      this.pipeline = this.device.createRenderPipeline(renderPipelineDescriptor);
    } else {
      throw "Unable to generate pipeline object due to incomplete descriptor.";
    }

    return { pipelineLayout: this.pipelineLayout, pipeline: this.pipeline };
  }
}
