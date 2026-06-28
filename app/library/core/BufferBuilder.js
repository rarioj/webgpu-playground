export class BufferBuilder {
  /**
   * @type {GPUDevice}
   */
  device = null;

  /**
   * @type {string}
   */
  label = "";

  /**
   * @type {GPUBufferUsageFlags}
   */
  usage = 0;

  /**
   * @type {number}
   */
  size = 0;

  /**
   * @type {Int32Array|Uint32Array|Float32Array}
   */
  data = null;

  /**
   * @type {string}
   */
  type = "float32";

  /**
   * @type {boolean}
   */
  mappedAtCreation = false;

  /**
   * @type {GPUBuffer}
   */
  buffer = null;

  /**
   * @type {GPUVertexBufferLayout}
   */
  bufferLayout = null;

  /**
   * @type {number}
   */
  offset = 0;

  /**
   * @type {number}
   */
  stride = 0;

  /**
   * @type {number}
   */
  count = 0;

  /**
   *
   * @param {GPUDevice} device
   */
  constructor(device) {
    this.device = device;
  }

  /**
   * @param {string} label
   * @returns {BufferBuilder}
   */
  setLabel(label) {
    this.label = label;
    return this;
  }

  /**
   * @param {GPUBufferUsageFlags} usage
   * @returns {BufferBuilder}
   */
  setUsage(usage) {
    this.usage = usage;
    return this;
  }

  /**
   * @param {number} size
   * @returns {BufferBuilder}
   */
  setSize(size) {
    this.size = size;
    return this;
  }

  /**
   * @param {Int32Array|Uint32Array|Float32Array} data
   * @returns {BufferBuilder}
   */
  setData(data) {
    this.data = data;
    this.size = data.byteLength;

    if (data instanceof Float32Array) {
      this.type = "float32";
    } else if (data instanceof Uint32Array) {
      this.type = "uint32";
    } else if (data instanceof Int32Array) {
      this.type = "sint32";
    }

    this.mappedAtCreation = true;
    return this;
  }

  /**
   * @param {number} count
   * @param {"uint32"|"sint32"|"float32"} [type]
   * @returns {BufferBuilder}
   */
  addVertexAttribute(count, type = "float32") {
    const byte = 4; // uint32, sint32, float32 - all 4 bytes
    const format = (this.type || type) + (count > 1 ? "x" + count : "");

    if (!this.bufferLayout) {
      this.bufferLayout = {
        arrayStride: 0,
        stepMode: "vertex",
        attributes: [],
      };
    }
    this.bufferLayout.arrayStride += byte * count;
    this.bufferLayout.attributes.push({
      format,
      offset: this.offset,
      shaderLocation: this.bufferLayout.attributes.length,
    });
    this.offset += byte * count;
    this.stride += count;

    return this;
  }

  /**
   * @returns {{buffer: GPUBuffer, bufferLayout: GPUVertexBufferLayout}}
   */
  build() {
    this.buffer = this.device.createBuffer({
      label: this.label || `Buffer size ${this.size}`,
      size: this.size,
      usage: this.usage,
      mappedAtCreation: this.mappedAtCreation,
    });

    if (this.data !== null && this.mappedAtCreation) {
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
        this.count = this.data.length / this.stride;
      }
    }

    return { buffer: this.buffer, bufferLayout: this.bufferLayout, count: this.count, stride: this.stride };
  }
}
