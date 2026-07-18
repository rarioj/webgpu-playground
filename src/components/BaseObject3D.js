import { BaseObject } from "./BaseObject.js";

import { vec3 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
export class BaseObject3D extends BaseObject {
  /**
   * @type {vec3}
   */
  position;

  /**
   * @type {vec3}
   */
  eulers;

  /**
   * @param {Object} [options]
   * @param {vec3} [options.position]
   * @param {vec3} [options.eulers]
   */
  constructor(options = {}) {
    super(options);

    const { position = [0, 0, 0], eulers = [0, 0, 0] } = options;

    this.position = position;
    this.eulers = eulers;
  }

  /**
   * @param {number} [x]
   * @param {number} [y]
   * @param {number} [z]
   */
  setPosition(x = 0, y = 0, z = 0) {
    this.position[0] = x;
    this.position[1] = y;
    this.position[2] = z;
  }

  /**
   * @returns {vec3}
   */
  getPosition() {
    return this.position;
  }

  /**
   * @param {number} [x] Pitch
   * @param {number} [y] Yaw
   * @param {number} [z] Roll
   */
  setEulers(x = 0, y = 0, z = 0) {
    this.eulers[0] = x;
    this.eulers[1] = y;
    this.eulers[2] = z;
  }

  /**
   * @returns {vec3}
   */
  getEulers() {
    return this.eulers;
  }
}
