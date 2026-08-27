import { WebGPU } from "./WebGPU.js";

/**
 * @classdesc
 */
export class WebGPUPipeline {
  /**
   * @type {WebGPU}
   */
  webgpu;

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
   * @type {GPUPipelineLayout}
   */
  pipelineLayout;

  /**
   * @type {GPURenderPipeline|GPUComputePipeline}
   */
  pipeline;

  /**
   * @param {WebGPU} webgpu
   * @param {string} [label]
   */
  constructor(webgpu, label = "Unlabelled") {
    this.webgpu = webgpu;
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
    this.pipelineLayout = undefined;
    this.pipeline = undefined;
  }

  /**
   * @param {GPUPipelineLayout} pipelineLayout
   * @returns {WebGPUPipeline}
   */
  setLayout(pipelineLayout) {
    this.renderPipelineDescriptor.layout = pipelineLayout;
    this.computePipelineDescriptor.layout = pipelineLayout;
    this.pipelineLayout = pipelineLayout;
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
    this.webgpu.debug && console.debug("GPUShaderModuleDescriptor", finalShaderModuleDescriptor);
    this.shaderModule = this.webgpu.device.createShaderModule(finalShaderModuleDescriptor);

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
   * @returns {WebGPUPipeline}
   */
  createPipelineLayout(overridePipelineLayoutDescriptor = {}) {
    if (!this.renderPipelineDescriptor.layout && !this.computePipelineDescriptor.layout) {
      this.pipelineLayoutDescriptor = { ...this.pipelineLayoutDescriptor, ...overridePipelineLayoutDescriptor };
      this.webgpu.debug && console.debug("GPUPipelineLayoutDescriptor", this.pipelineLayoutDescriptor);

      const pipelineLayout = this.webgpu.device.createPipelineLayout(this.pipelineLayoutDescriptor);
      this.renderPipelineDescriptor.layout = pipelineLayout;
      this.computePipelineDescriptor.layout = pipelineLayout;
      this.pipelineLayout = pipelineLayout;
    }
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline|GPUDevice: createRenderPipeline() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createComputePipeline|GPUDevice: createComputePipeline() method}
   * @param {Object} [options]
   * @param {GPUPipelineLayoutDescriptor} [options.overridePipelineLayoutDescriptor]
   * @param {GPURenderPipelineDescriptor} [options.overrideRenderPipelineDescriptor]
   * @param {GPUComputePipelineDescriptor} [options.overrideComputePipelineDescriptor]
   * @returns {WebGPUPipeline}
   */
  build(options = {}) {
    const { overridePipelineLayoutDescriptor = {}, overrideRenderPipelineDescriptor = {}, overrideComputePipelineDescriptor = {} } = options;
    this.createPipelineLayout(overridePipelineLayoutDescriptor);

    if (this.renderPipelineDescriptor?.vertex) {
      this.renderPipelineDescriptor = { ...this.renderPipelineDescriptor, ...overrideRenderPipelineDescriptor };
      this.webgpu.debug && console.debug("GPURenderPipelineDescriptor", this.renderPipelineDescriptor);
      this.pipeline = this.webgpu.device.createRenderPipeline(this.renderPipelineDescriptor);
    } else if (this.computePipelineDescriptor?.compute) {
      this.computePipelineDescriptor = { ...this.computePipelineDescriptor, ...overrideComputePipelineDescriptor };
      this.webgpu.debug && console.debug("GPUComputePipelineDescriptor", this.computePipelineDescriptor);
      this.pipeline = this.webgpu.device.createComputePipeline(this.computePipelineDescriptor);
    } else {
      throw new Error("Unable to create a GPU pipeline object due to invalid/incomplete descriptor");
    }

    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipelineAsync|GPUDevice: createRenderPipelineAsync() method}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createComputePipelineAsync|GPUDevice: createComputePipelineAsync() method}
   * @param {Object} [options]
   * @param {GPUPipelineLayoutDescriptor} [options.overridePipelineLayoutDescriptor]
   * @param {GPURenderPipelineDescriptor} [options.overrideRenderPipelineDescriptor]
   * @param {GPUComputePipelineDescriptor} [options.overrideComputePipelineDescriptor]
   * @returns {Promise.<WebGPUPipeline>}
   */
  async buildAsync(options = {}) {
    const { overridePipelineLayoutDescriptor = {}, overrideRenderPipelineDescriptor = {}, overrideComputePipelineDescriptor = {} } = options;
    this.createPipelineLayout(overridePipelineLayoutDescriptor);

    if (this.renderPipelineDescriptor?.vertex) {
      this.renderPipelineDescriptor = { ...this.renderPipelineDescriptor, ...overrideRenderPipelineDescriptor };
      this.webgpu.debug && console.debug("GPURenderPipelineDescriptor", this.renderPipelineDescriptor);
      this.pipeline = await this.webgpu.device.createRenderPipelineAsync(this.renderPipelineDescriptor);
    } else if (this.computePipelineDescriptor?.compute) {
      this.computePipelineDescriptor = { ...this.computePipelineDescriptor, ...overrideComputePipelineDescriptor };
      this.webgpu.debug && console.debug("GPUComputePipelineDescriptor", this.computePipelineDescriptor);
      this.pipeline = await this.webgpu.device.createComputePipelineAsync(this.computePipelineDescriptor);
    } else {
      throw new Error("Unable to create a GPU pipeline object due to invalid/incomplete descriptor");
    }

    return this;
  }
}
