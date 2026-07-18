import { BaseObject3D } from "./BaseObject3D.js";
import { degreeToRadian } from "../helper/maths.js";

import { vec3, mat4 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
export class BaseModel extends BaseObject3D {
  /**
   * @type {vec3}
   */
  scale;

  /**
   * @type {mat4}
   */
  matrix;

  /**
   * @param {Object} [options]
   * @param {vec3} [options.scale]
   */
  constructor(options = {}) {
    super(options);

    const { scale = [1.0, 1.0, 1.0] } = options;

    this.scale = scale;
    this.matrix = mat4.identity();
    this.storage.main = [this.matrix];

    this.applyTransform();
  }

  /**
   * @param {number} [x]
   * @param {number} [y]
   * @param {number} [z]
   */
  setScale(x = 1.0, y = 1.0, z = 1.0) {
    this.scale[0] = x;
    this.scale[1] = y;
    this.scale[2] = z;
  }

  /**
   * @returns {vec3}
   */
  getScale() {
    return this.scale;
  }

  /**
   *
   */
  applyTransform() {
    const transformation = mat4.identity();
    mat4.translate(transformation, this.position, transformation);
    mat4.rotateX(transformation, degreeToRadian(this.eulers[0]), transformation);
    mat4.rotateY(transformation, degreeToRadian(this.eulers[1]), transformation);
    mat4.rotateZ(transformation, degreeToRadian(this.eulers[2]), transformation);
    mat4.multiply(transformation, mat4.scaling(this.scale), transformation);
    this.matrix.set(transformation);
  }

  /**
   *
   */
  update() {
    super.update();
    this.applyTransform();
  }
}
