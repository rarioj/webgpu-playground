/**
 * @callback ObjectUpdateCallback
 * @param {BaseObject} objectToUpdate
 */

/**
 * @classdesc
 */
export class BaseObject {
  /**
   * @type {Object.<string, number[][]>}
   */
  storage;

  /**
   * @type {Object.<string, any>}
   */
  attributes;

  /**
   * @type {ObjectUpdateCallback}
   */
  updateCallback;

  /**
   * @param {Object} [options]
   * @param {boolean} [options.debug]
   */
  constructor(options = {}) {
    const { debug = false } = options;

    this.storage = { main: [] };
    this.attributes = { debug };
  }

  /**
   * @param {ObjectUpdateCallback} callback
   */
  setUpdateCallback(callback) {
    this.updateCallback = callback;
  }

  /**
   *
   */
  update() {
    if (typeof this.updateCallback === "function") {
      this.updateCallback(this);
    }
  }

  /**
   * @param {string} [name]
   * @param {number} [size]
   * @returns {Float32Array}
   */
  getStorageFloat(name = "main", size = 0) {
    if (!Object.hasOwn(this.storage, name)) {
      throw `Invalid object storage name: ${name}`;
    }
    const flatten = this.flatten(this.storage[name], size);
    const array = new Float32Array(flatten.length);
    array.set(flatten);
    return array;
  }

  /**
   * @param {string} [name]
   * @param {number} [size]
   * @returns {Uint32Array}
   */
  getStorageUint(name = "main", size = 0) {
    if (!Object.hasOwn(this.storage, name)) {
      throw `Invalid object storage name: ${name}`;
    }
    const flatten = this.flatten(this.storage[name], size);
    const array = new Uint32Array(flatten.length);
    array.set(flatten);
    return array;
  }

  /**
   * @param {string} [name]
   * @param {number} [size]
   * @returns {Int32Array}
   */
  getStorageInt(name = "main", size = 0) {
    if (!Object.hasOwn(this.storage, name)) {
      throw `Invalid object storage name: ${name}`;
    }
    const flatten = this.flatten(this.storage[name], size);
    const array = new Int32Array(flatten.length);
    array.set(flatten);
    return array;
  }

  /**
   * @param {number[][]} data
   * @param {number} [size]
   * @returns {number[]}
   */
  flatten(data, size = 0) {
    const dataSize = size ? Math.min(size, data.length) : data.length;
    const flattened = [];
    for (let i = 0; i < dataSize; i++) {
      const child = data[i];
      if (Array.isArray(child) || (child && child.buffer instanceof ArrayBuffer)) {
        for (let j = 0; j < child.length; j++) {
          flattened.push(child[j]);
        }
      } else {
        flattened.push(child);
      }
    }
    return flattened;
  }
}
