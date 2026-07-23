import { BaseNode } from "./BaseNode.js";

import { vec3 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
export class TriangularNode extends BaseNode {
  /**
   * @type {[vec3, vec3, vec3]}
   */
  vertices;

  /**
   * @type {[vec3, vec3, vec3]}
   */
  textures;

  /**
   * @type {[vec3, vec3, vec3]}
   */
  normals;

  /**
   * @type {vec3}
   */
  center;

  /**
   * @param {Object} [options]
   * @param {[vec3, vec3, vec3]} [options.vertices]
   * @param {[vec3, vec3, vec3]} [options.textures]
   * @param {[vec3, vec3, vec3]} [options.normals]
   * @param {[vec3, vec3, vec3]} [options.offsets]
   * @param {vec3} [options.center]
   * @param {vec3} [options.color]
   */
  constructor(options = {}) {
    super(options);

    const {
      vertices = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      textures = [],
      normals = [],
      offsets = false,
      center = [0, 0, 0],
      color = [1.0, 1.0, 1.0],
    } = options;

    this.vertices = vertices;
    this.textures = textures;
    this.normals = normals;

    this.center = center;
    this.attributes.color = color;

    if (offsets) {
      this.vertices = [];
      this.center = [0, 0, 0];

      const weight = [0.33333, 0.33333, 0.33333];

      for (let i = 0; i < offsets.length; i++) {
        const corner = [center[0], center[1], center[2]];
        this.vertices.push([corner[0] + offsets[i][0], corner[1] + offsets[i][1], corner[2] + offsets[i][2]]);

        const tempCenter = [corner[0], corner[1], corner[2]];
        vec3.multiply(tempCenter, weight, tempCenter);
        vec3.add(this.center, tempCenter, this.center);
      }
    }

    for (let i = 0; i < this.vertices.length; i++) {
      vec3.min(this.minCorner, this.vertices[i], this.minCorner);
      vec3.max(this.maxCorner, this.vertices[i], this.maxCorner);
    }
  }
}
