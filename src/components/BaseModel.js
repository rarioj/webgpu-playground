import { BaseObject3D } from "./BaseObject3D.js";
import { degreeToRadian } from "../helper/maths.js";

import { mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

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

    this.updateTransform();
  }

  /**
   * @param {number} [x]
   * @param {number} [y]
   * @param {number} [z]
   */
  setScale(x = 0, y = 0, z = 0) {
    this.scale[0] = x;
    this.scale[1] = y;
    this.scale[2] = z;
  }

  /**
   *
   */
  updateTransform() {
    this.matrix = mat4.identity();
    mat4.translate(this.matrix, this.position, this.matrix);
    mat4.rotateX(this.matrix, degreeToRadian(this.eulers[0]), this.matrix);
    mat4.rotateY(this.matrix, degreeToRadian(this.eulers[1]), this.matrix);
    mat4.rotateZ(this.matrix, degreeToRadian(this.eulers[2]), this.matrix);
    mat4.multiply(this.matrix, mat4.scaling(this.scale), this.matrix);
  }

  /**
   *
   */
  update() {
    super.update();
    this.updateTransform();
  }
}
