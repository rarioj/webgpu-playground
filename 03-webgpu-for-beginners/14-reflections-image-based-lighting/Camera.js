import { vec3 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";
import { convertRadianToDegree } from "./library/helper/utility.js";

/**
 * @classdesc
 */
export class Camera {
  /**
   * @type {vec3}
   */
  position = [0, 0, 0];

  /**
   * @type {vec3}
   */
  eulers = [0, 0, 0];

  /**
   * @type {vec3}
   */
  forward = null;

  /**
   * @type {vec3}
   */
  right = null;

  /**
   * @type {vec3}
   */
  up = null;

  /**
   *
   */
  constructor() {
    this.update();
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
   *
   */
  update() {
    const phi = convertRadianToDegree(this.eulers[1]);
    const theta = convertRadianToDegree(this.eulers[2]);

    this.forward = new Float32Array([
      Math.cos(theta) * Math.cos(phi), // cos(theta) * cos(phi)
      Math.sin(theta) * Math.cos(phi), // sin(theta) * cos(phi)
      Math.sin(phi), // sin(phi)
    ]);

    this.right = vec3.cross(this.forward, [0.0, 0.0, 1.0]);
    this.up = vec3.cross(this.right, this.forward);
  }
}
