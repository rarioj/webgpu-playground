import { Base3DObject } from "./Base3DObject.js";
import { degreeToRadian } from "../helper/maths.js";

import { mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

/**
 * @classdesc
 */
export class BaseModel extends Base3DObject {
  /**
   * @type {mat4}
   */
  matrix;

  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    super(options);
    this.updateModel();
  }

  /**
   *
   */
  updateModel() {
    this.matrix = mat4.identity();
    this.matrix = mat4.translate(this.matrix, this.position);
    this.matrix = mat4.rotateX(this.matrix, degreeToRadian(this.eulers[0]));
    this.matrix = mat4.rotateY(this.matrix, degreeToRadian(this.eulers[1]));
    this.matrix = mat4.rotateZ(this.matrix, degreeToRadian(this.eulers[2]));
  }

  /**
   *
   */
  update() {
    super.update();
    this.updateModel();
  }
}
