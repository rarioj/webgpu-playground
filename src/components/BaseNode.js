import { BaseObject } from "./BaseObject.js";

import { vec3 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
export class BaseNode extends BaseObject {
  /**
   * @type {vec3}
   */
  minCorner;

  /**
   * @type {vec3}
   */
  maxCorner;

  /**
   * @type {[number]}
   */
  leftChild;

  /**
   * @type {[number]}
   */
  primitiveCount;

  /**
   * @param {Object} [options]
   * @param {vec3} [options.minCorner]
   * @param {vec3} [options.maxCorner]
   */
  constructor(options = {}) {
    super(options);

    const { minCorner = [Infinity, Infinity, Infinity], maxCorner = [-Infinity, -Infinity, -Infinity] } = options;

    this.minCorner = minCorner;
    this.maxCorner = maxCorner;
    this.leftChild = [0];
    this.primitiveCount = [0];
    this.storage.main = [this.minCorner, this.leftChild, this.maxCorner, this.primitiveCount];
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setMinCorner(x, y, z) {
    this.minCorner[0] = x;
    this.minCorner[1] = y;
    this.minCorner[2] = z;
  }

  /**
   * @returns {vec3}
   */
  getMinCorner() {
    return this.minCorner;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setMaxCorner(x, y, z) {
    this.maxCorner[0] = x;
    this.maxCorner[1] = y;
    this.maxCorner[2] = z;
  }

  /**
   * @returns {vec3}
   */
  getMaxCorner() {
    return this.maxCorner;
  }

  /**
   * @param {number} value
   */
  setLeftChild(value) {
    this.leftChild[0] = value;
  }

  /**
   * @returns {number}
   */
  getLeftChild() {
    return this.leftChild[0];
  }

  /**
   * @param {number} value
   */
  setPrimitiveCount(value) {
    this.primitiveCount[0] = value;
  }

  /**
   * @returns {number}
   */
  getPrimitiveCount() {
    return this.primitiveCount[0];
  }
}
