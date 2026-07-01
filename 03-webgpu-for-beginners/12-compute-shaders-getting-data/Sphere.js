/**
 * @classdesc
 */
export class Sphere {
  /**
   * @type {Float32Array}
   */
  center;

  /**
   * @type {Float32Array}
   */
  color;

  /**
   * @type {number}
   */
  radius;

  /**
   * @param {Float32Array} center
   * @param {Float32Array} color
   * @param {number} radius
   */
  constructor(center, color, radius) {
    this.center = new Float32Array(center);
    this.color = new Float32Array(color);
    this.radius = radius;
  }
}
