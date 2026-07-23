import { BaseNode } from "./BaseNode.js";

import { vec3 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
export class SphericalNode extends BaseNode {
  /**
   * @type {number}
   */
  radius;

  /**
   * @type {vec3}
   */
  center;

  /**
   * @param {Object} [options]
   * @param {number} [options.radius]
   * @param {vec3} [options.center]
   * @param {vec3} [options.color]
   */
  constructor(options = {}) {
    super(options);

    const { radius = 1, center = [0, 0, 0], color = [1.0, 1.0, 1.0] } = options;

    this.radius = radius;
    this.center = center;
    this.attributes.color = color;

    const axis = [this.radius, this.radius, this.radius];
    const temp = [0, 0, 0];

    vec3.subtract(this.center, axis, temp);
    vec3.min(this.minCorner, temp, this.minCorner);
    vec3.add(this.center, axis, temp);
    vec3.max(this.maxCorner, temp, this.maxCorner);
  }
}
