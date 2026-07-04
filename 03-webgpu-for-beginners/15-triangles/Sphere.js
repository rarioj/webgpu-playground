import { vec3 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

/**
 * @classdesc
 */
export class Sphere {
  /**
   * @type {vec3}
   */
  center;

  /**
   * @type {vec3}
   */
  color;

  /**
   * @type {number}
   */
  radius;

  /**
   * @param {vec3} center
   * @param {vec3} color
   * @param {number} radius
   */
  constructor(center, color, radius) {
    this.center = center;
    this.color = color;
    this.radius = radius;
  }
}
