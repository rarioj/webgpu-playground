import { vec3, mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";
import { convertDegreeToRadian } from "../helper/utility.js";

/**
 * @classdesc
 */
export class BasicModel {
  /**
   * @type {vec3}
   */
  position = [0, 0, 0];

  /**
   * @type {vec3}
   */
  eulers = [0, 0, 0];

  /**
   * @type {mat4}
   */
  matrix = null;

  /**
   * @type {function(BasicModel): void}
   */
  updateCallback = null;

  /**
   *
   */
  constructor() {
    this.init();
  }

  /**
   *
   */
  init() {
    this.matrix = mat4.identity();
    this.matrix = mat4.translate(this.matrix, this.position);
    this.matrix = mat4.rotateX(this.matrix, convertDegreeToRadian(this.eulers[0]));
    this.matrix = mat4.rotateY(this.matrix, convertDegreeToRadian(this.eulers[1]));
    this.matrix = mat4.rotateZ(this.matrix, convertDegreeToRadian(this.eulers[2]));
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
   * @param {number} [x]
   * @param {number} [y]
   * @param {number} [z]
   */
  setEulers(x = 0, y = 0, z = 0) {
    this.eulers = [x, y, z];
  }

  /**
   * @param {function(BasicModel): void} callback
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
    this.init();
    if (typeof this.updateCallback === "function") {
      this.updateCallback(this);
    }
  }
}
