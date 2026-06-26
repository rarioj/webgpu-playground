import { vec3, mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

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
  model = null;

  /**
   * @type {function(BasicModel): void}
   */
  updateCallback;

  /**
   * @param {function(BasicModel): void} [callback]
   */
  constructor(callback = null) {
    this.init();
    this.updateCallback = callback;
  }

  /**
   *
   */
  init() {
    this.model = mat4.identity();
    mat4.translate(this.model, this.position, this.model);
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
