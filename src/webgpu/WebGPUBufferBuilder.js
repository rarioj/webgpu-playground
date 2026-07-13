/**
 * @classdesc
 */
export class WebGPUBufferBuilder {
  /**
   * @type {number}
   */
  #BYTE_SIZE = 4;

  /**
   * @type {GPUDevice}
   */
  device;

  /**
   * @type {string}
   */
  label;

  /**
   * @type {GPUBufferUsageFlags}
   */
  usage;

  /**
   * @type {number}
   */
  size;

  /**
   * @type {Int32Array|Uint32Array|Float32Array}
   */
  data;

  /**
   * @type {"uint32"|"sint32"|"float32"}
   */
  baseType;

  /**
   * @type {boolean}
   */
  mappedAtCreation;

  /**
   * @type {GPUBuffer}
   */
  buffer;

  /**
   * @type {GPUVertexBufferLayout}
   */
  bufferLayout;

  /**
   * @type {number}
   */
  offset;

  /**
   * @type {number}
   */
  stride;

  /**
   * @type {boolean}
   */
  debug;

  /**
   *
   * @param {GPUDevice} device
   */
  constructor(device) {
    this.device = device;
    this.label = "";
    this.usage = 0;
    this.size = 0;
    this.baseType = "float32";
    this.mappedAtCreation = false;
    this.offset = 0;
    this.stride = 0;
    this.debug = false;
  }

  /**
   * @param {string} label
   * @returns {WebGPUBufferBuilder}
   */
  setLabel(label) {
    this.label = label;
    return this;
  }

  /**
   * @param {GPUBufferUsageFlags} usage
   * @returns {WebGPUBufferBuilder}
   */
  setUsage(usage) {
    this.usage = usage;
    return this;
  }

  /**
   * @param {number} size
   * @returns {WebGPUBufferBuilder}
   */
  setSize(size) {
    this.size = size;
    return this;
  }

  /**
   * @param {Int32Array|Uint32Array|Float32Array} data
   * @returns {WebGPUBufferBuilder}
   */
  setData(data) {
    this.data = data;
    this.setSize(data.byteLength);

    if (data instanceof Float32Array) {
      this.baseType = "float32";
    } else if (data instanceof Uint32Array) {
      this.baseType = "uint32";
    } else if (data instanceof Int32Array) {
      this.baseType = "sint32";
    }

    this.mappedAtCreation = true;
    return this;
  }

  /**
   * @param {number} count
   * @param {"uint32"|"sint32"|"float32"} [type]
   * @returns {WebGPUBufferBuilder}
   */
  addVertexAttribute(count, type = "float32") {
    const format = (this.baseType || type) + (count > 1 ? "x" + count : "");

    if (!this.bufferLayout) {
      this.bufferLayout = {
        arrayStride: 0,
        stepMode: "vertex",
        attributes: [],
      };
    }
    this.bufferLayout.arrayStride += this.#BYTE_SIZE * count;
    this.bufferLayout.attributes.push({
      format,
      offset: this.offset,
      shaderLocation: this.bufferLayout.attributes.length,
    });
    this.offset += this.#BYTE_SIZE * count;
    this.stride += count;

    return this;
  }

  /**
   * @param {boolean} debug
   * @returns {WebGPUBufferBuilder}
   */
  setDebug(debug) {
    this.debug = debug;
    return this;
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBuffer|GPUDevice: createBuffer() method}
   * @returns {{buffer: GPUBuffer, bufferLayout: GPUVertexBufferLayout, vertexCount: number}}
   */
  build() {
    this.build.bufferCounter = this.build.bufferCounter || 0;

    /** @type {GPUBufferDescriptor} */
    const bufferDescriptor = {
      label: this.label || `Buffer #${this.build.bufferCounter++}`,
      size: this.size,
      usage: this.usage,
      mappedAtCreation: this.mappedAtCreation,
    };
    if (this.debug) {
      console.debug("GPUBufferDescriptor", bufferDescriptor);
      if (this.bufferLayout) {
        console.debug("GPUVertexBufferLayout", this.bufferLayout);
      }
    }
    this.buffer = this.device.createBuffer(bufferDescriptor);

    let vertexCount = 0;
    if (this.data && this.mappedAtCreation) {
      const mapped = this.buffer.getMappedRange();
      if (this.data instanceof Float32Array) {
        new Float32Array(mapped).set(this.data);
      } else if (this.data instanceof Uint32Array) {
        new Uint32Array(mapped).set(this.data);
      } else if (this.data instanceof Int32Array) {
        new Int32Array(mapped).set(this.data);
      }
      this.buffer.unmap();
      if (this.stride) {
        vertexCount = this.data.length / this.stride;
      }
    }

    return { buffer: this.buffer, bufferLayout: this.bufferLayout, vertexCount };
  }
}
