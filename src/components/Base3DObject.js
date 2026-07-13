import { vec3 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

/**
 * @classdesc
 */
export class Base3DObject {
  /**
   * @type {string}
   */
  label;

  /**
   * @type {vec3}
   */
  position;

  /**
   * @type {vec3}
   */
  eulers;

  /**
   * @type {boolean}
   */
  debug;

  /**
   * @type {function(Base3DObject): void}
   */
  updateCallback;

  /**
   * @param {Object} [options]
   * @param {string} [options.label]
   * @param {vec3} [options.position]
   * @param {vec3} [options.eulers]
   * @param {boolean} [options.debug]
   */
  constructor(options = {}) {
    const { label = "Unnamed 3D object", position = [0, 0, 0], eulers = [0, 0, 0], debug = false } = options;

    this.label = label;
    this.position = position;
    this.eulers = eulers;
    this.debug = debug;
  }

  /**
   * @param {number} [x]
   * @param {number} [y]
   * @param {number} [z]
   */
  setPosition(x = 0, y = 0, z = 0) {
    this.position = [x, y, z];
  }

  /**
   * @param {number} [x] Pitch
   * @param {number} [y] Yaw
   * @param {number} [z] Roll
   */
  setEulers(x = 0, y = 0, z = 0) {
    this.eulers = [x, y, z];
  }

  /**
   * @param {function(Base3DObject): void} callback
   */
  setUpdateCallback(callback) {
    if (typeof callback === "function") {
      this.updateCallback = callback;
    }
  }

  /**
   *
   */
  update() {
    if (typeof this.updateCallback === "function") {
      this.updateCallback(this);
    }
  }
}
