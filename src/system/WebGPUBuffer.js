import { WebGPU } from "./WebGPU.js";

/**
 * @classdesc
 */
export class WebGPUBuffer {
  /**
   * @type {Object.<string, {size: number, alignment: number}}
   */
  static VERTEX_FORMAT_MAP = {
    // 8-bit
    uint8x2: { size: 2, alignment: 1 },
    sint8x2: { size: 2, alignment: 1 },
    unorm8x2: { size: 2, alignment: 1 },
    snorm8x2: { size: 2, alignment: 1 },
    uint8x4: { size: 4, alignment: 1 },
    sint8x4: { size: 4, alignment: 1 },
    unorm8x4: { size: 4, alignment: 1 },
    snorm8x4: { size: 4, alignment: 1 },
    // 16-bit
    uint16x2: { size: 4, alignment: 2 },
    sint16x2: { size: 4, alignment: 2 },
    unorm16x2: { size: 4, alignment: 2 },
    snorm16x2: { size: 4, alignment: 2 },
    float16x2: { size: 4, alignment: 2 },
    uint16x4: { size: 8, alignment: 2 },
    sint16x4: { size: 8, alignment: 2 },
    unorm16x4: { size: 8, alignment: 2 },
    snorm16x4: { size: 8, alignment: 2 },
    float16x4: { size: 8, alignment: 2 },
    // 32-bit
    float32: { size: 4, alignment: 4 },
    uint32: { size: 4, alignment: 4 },
    sint32: { size: 4, alignment: 4 },
    float32x2: { size: 8, alignment: 4 },
    uint32x2: { size: 8, alignment: 4 },
    sint32x2: { size: 8, alignment: 4 },
    float32x3: { size: 12, alignment: 4 },
    uint32x3: { size: 12, alignment: 4 },
    sint32x3: { size: 12, alignment: 4 },
    float32x4: { size: 16, alignment: 4 },
    uint32x4: { size: 16, alignment: 4 },
    sint32x4: { size: 16, alignment: 4 },
    // Packed
    "unorm10-10-10-2": { size: 4, alignment: 4 },
  };

  /**
   * @type {WebGPU}
   */
  webgpu;

  /**
   * @type {GPUBufferDescriptor}
   */
  bufferDescriptor;

  /**
   * @type {GPUVertexBufferLayout}
   */
  vertexBufferLayout;

  /**
   * @type {GPUVertexBufferLayout[]}
   */
  arrayVertexBufferLayout;

  /**
   * @type {number}
   */
  shaderLocation;

  /**
   * @type {Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array}
   */
  data;

  /**
   * @type {GPUBuffer}
   */
  buffer;

  /**
   *
   * @param {WebGPU} webgpu
   * @param {string} [label]
   */
  constructor(webgpu, label = "Unlabelled") {
    this.webgpu = webgpu;
    this.bufferDescriptor = {
      label: `${label} (GPUBuffer)`,
      size: 0,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false,
    };
    this.vertexBufferLayout = {
      arrayStride: 0,
      stepMode: "vertex",
      attributes: [],
    };
    this.arrayVertexBufferLayout = [];
    this.shaderLocation = 0;
    this.buffer = undefined;
  }

  /**
   * @param {number} size
   * @returns {WebGPUBuffer}
   */
  setSize(size) {
    this.bufferDescriptor.size = size;
    return this;
  }

  /**
   * @param {GPUBufferUsageFlags} bufferUsageFlags
   * @returns {WebGPUBuffer}
   */
  setUsage(bufferUsageFlags) {
    this.bufferDescriptor.usage = bufferUsageFlags;
    return this;
  }

  /**
   * @param {Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array} data
   * @returns {WebGPUBuffer}
   */
  loadBufferData(data) {
    this.data = data;
    this.setSize(Math.max(4, Math.ceil(data.byteLength / 4) * 4));
    this.bufferDescriptor.mappedAtCreation = true;
    return this;
  }

  /**
   * @param {number} [bufferOffset]
   * @param {number} [dataOffset]
   * @param {number} [size]
   * @returns {WebGPUBuffer}
   */
  writeDataToBuffer(bufferOffset = 0, dataOffset = undefined, size = undefined) {
    this.webgpu.device.queue.writeBuffer(this.buffer, bufferOffset, this.data, dataOffset, size);
    return this;
  }

  /**
   * @param {GPUVertexFormat} vertexFormat
   * @param {number} [shaderLocation]
   * @returns {WebGPUBuffer}
   */
  addVertexAttribute(vertexFormat, shaderLocation = undefined) {
    if (!WebGPUBuffer.VERTEX_FORMAT_MAP[vertexFormat]) {
      throw new Error(`Invalid vertex format: ${vertexFormat}`);
    }

    const format = WebGPUBuffer.VERTEX_FORMAT_MAP[vertexFormat];
    this.vertexBufferLayout.attributes.push({
      format: vertexFormat,
      offset: this.vertexBufferLayout.arrayStride,
      shaderLocation: shaderLocation || this.shaderLocation++,
    });
    this.vertexBufferLayout.arrayStride += format.size;

    return this;
  }

  /**
   * @param {GPUVertexStepMode} [stepMode]
   * @returns {WebGPUBuffer}
   */
  newVertexBufferLayoutGroup(stepMode = "vertex") {
    if (this.vertexBufferLayout.attributes.length) {
      this.arrayVertexBufferLayout.push(this.vertexBufferLayout);
    }

    this.vertexBufferLayout = {
      arrayStride: 0,
      stepMode,
      attributes: [],
    };
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBuffer|GPUDevice: createBuffer() method}
   * @param {Object} [options]
   * @param {GPUBufferDescriptor} [options.overrideBufferDescriptor]
   * @returns {WebGPUBuffer}
   */
  build(options = {}) {
    const { overrideBufferDescriptor = {} } = options;

    /** @type {GPUBufferDescriptor} */
    const finalBufferDescriptor = { ...this.bufferDescriptor, ...overrideBufferDescriptor };
    this.webgpu.debug && console.debug("GPUBufferDescriptor", finalBufferDescriptor);
    this.buffer = this.webgpu.device.createBuffer(finalBufferDescriptor);

    if (this.vertexBufferLayout.arrayStride === 0) {
      this.vertexBufferLayout = undefined;
    } else {
      this.arrayVertexBufferLayout.push(this.vertexBufferLayout);
      this.webgpu.debug && console.debug("GPUVertexBufferLayout", this.vertexBufferLayout);
    }

    if (this.arrayVertexBufferLayout.length === 0) {
      this.arrayVertexBufferLayout = undefined;
    } else {
      this.webgpu.debug && console.debug("GPUVertexBufferLayout[]", this.arrayVertexBufferLayout);
    }

    if (this.data) {
      const range = this.buffer.getMappedRange();
      const arrayType = this.data.constructor;
      new arrayType(range).set(this.data);
      this.buffer.unmap();
    }

    return this;
  }

  /**
   * @param {number} [begin]
   * @param {number} [end]
   * @returns {Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array}
   */
  mapData(begin = 0, end = undefined) {
    if (this.data) {
      return this.data.subarray(begin, end);
    }
    throw new Error("No data to create a pointer from");
  }

  /**
   * @param {ArrayLike} array
   * @param {number} [offset]
   */
  setData(array, offset = 0) {
    this.data.set(array, offset);
    return this;
  }
}
