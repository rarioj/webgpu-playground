/**
 * @classdesc
 */
export class WebGPUBuffer {
  /**
   * @type {boolean}
   */
  debug;

  /**
   * @type {GPUDevice}
   */
  device;

  /**
   * @type {GPUBufferDescriptor}
   */
  bufferDescriptor;

  /**
   * @type {GPUVertexBufferLayout}
   */
  vertexBufferLayout;

  /**
   * @type {Int32Array|Uint32Array|Float32Array}
   */
  data;

  /**
   * @type {GPUBuffer}
   */
  buffer;

  /**
   *
   * @param {GPUDevice} device
   * @param {string} [label]
   */
  constructor(device, label = "Unlabelled") {
    this.debug = false;
    this.device = device;
    this.bufferDescriptor = {
      label: `${label} (GPUBuffer)`,
      size: 0,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false,
    };
    this.vertexBufferLayout = {
      arrayStride: 0,
      attributes: [],
    };
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
   * @param {Int32Array|Uint32Array|Float32Array} data
   * @returns {WebGPUBuffer}
   */
  setData(data) {
    this.data = data;
    this.setSize(data.byteLength);
    this.bufferDescriptor.mappedAtCreation = true;
    return this;
  }

  /**
   * @param {GPUVertexFormat} vertexFormat
   * @returns {WebGPUBuffer}
   */
  addVertexAttribute(vertexFormat) {
    const indexOfX = vertexFormat.indexOf("x");
    let count = 1;
    if (indexOfX !== -1 && indexOfX + 1 < vertexFormat.length) {
      count = parseInt(vertexFormat[indexOfX + 1]);
    }

    this.vertexBufferLayout.attributes.push({
      format: vertexFormat,
      offset: this.vertexBufferLayout.arrayStride,
      shaderLocation: this.vertexBufferLayout.attributes.length,
    });

    const byteSize = this.data ? this.data.constructor.BYTES_PER_ELEMENT : Float32Array.BYTES_PER_ELEMENT;
    this.vertexBufferLayout.arrayStride += byteSize * count;

    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBuffer|GPUDevice: createBuffer() method}
   * @param {Object} [options]
   * @param {GPUBufferDescriptor} [options.overrideBufferDescriptor]
   * @returns {{builder: WebGPUBuffer, buffer: GPUBuffer, vertexBufferLayout?: GPUVertexBufferLayout}}
   */
  build(options = {}) {
    const { overrideBufferDescriptor = {} } = options;

    /** @type {GPUBufferDescriptor} */
    const finalBufferDescriptor = { ...this.bufferDescriptor, ...overrideBufferDescriptor };
    this.debug && console.debug("GPUBufferDescriptor", finalBufferDescriptor);
    this.buffer = this.device.createBuffer(finalBufferDescriptor);

    if (this.vertexBufferLayout.arrayStride === 0) {
      this.vertexBufferLayout = undefined;
    } else {
      this.debug && console.debug("GPUVertexBufferLayout", this.vertexBufferLayout);
    }

    if (this.data) {
      const range = this.buffer.getMappedRange();
      const arrayType = this.data.constructor;
      new arrayType(range).set(this.data);
      this.buffer.unmap();
    }

    return { builder: this, buffer: this.buffer, vertexBufferLayout: this.vertexBufferLayout };
  }

  /**
   * @param {number} [begin]
   * @param {number} [end]
   */
  dataPointer(begin = 0, end = undefined) {
    if (this.data) {
      return this.data.subarray(begin, end);
    }
    throw new Error("No data to create a pointer from");
  }

  /**
   * @param {number} [bufferOffset]
   * @param {number} [dataOffset]
   * @param {number} [size]
   * @returns {WebGPUBuffer}
   */
  writeDataToBuffer(bufferOffset = 0, dataOffset = undefined, size = undefined) {
    this.device.queue.writeBuffer(this.buffer, bufferOffset, this.data, dataOffset, size);
    return this;
  }
}
