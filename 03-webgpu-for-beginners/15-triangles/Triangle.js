import { vec3 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

/**
 * @classdesc
 */
export class Triangle {
  /**
   * @type {vec3}
   */
  center;

  /**
   * @type {vec3}
   */
  color;

  /**
   * @type {vec3[]}
   */
  corners = [];

  /**
   * @param {vec3} center
   * @param {vec3} color
   * @param {vec3[]} offsets
   */
  constructor(center, color, offsets) {
    this.center = [0, 0, 0];
    this.color = color;

    const weight = [0.333333, 0.333333, 0.333333];

    offsets.forEach((offset) => {
      const corner = [center[0], center[1], center[2]];
      this.corners.push([corner[0] + offset[0], corner[1] + offset[1], corner[2] + offset[2]]);

      const tempCorner = [corner[0], corner[1], corner[2]];
      vec3.multiply(tempCorner, weight, tempCorner);
      vec3.add(this.center, tempCorner, this.center);
    });
  }
}
