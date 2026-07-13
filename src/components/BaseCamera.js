import { Base3DObject } from "./Base3DObject.js";
import { degreeToRadian } from "../helper/maths.js";

import { vec3, mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

/**
 * @classdesc
 */
export class BaseCamera extends Base3DObject {
  /**
   * @type {HTMLCanvasElement}
   */
  canvas;

  /**
   * @type {number}
   */
  fov;

  /**
   * @type {number}
   */
  aspect;

  /**
   * @type {number}
   */
  near;

  /**
   * @type {number}
   */
  far;

  /**
   * @type {vec3}
   */
  forward;

  /**
   * @type {vec3}
   */
  right;

  /**
   * @type {vec3}
   */
  up;

  /**
   * @type {mat4}
   */
  view;

  /**
   * @type {mat4}
   */
  projection;

  /**
   * @param {Object} [options]
   * @param {HTMLCanvasElement} [options.canvas]
   * @param {number} [options.fov]
   * @param {number} [options.aspect]
   * @param {number} [options.near]
   * @param {number} [options.far]
   */
  constructor(options = {}) {
    super(options);

    const { canvas = document.querySelector("canvas"), fov = Math.PI / 4, aspect = canvas.width / canvas.height, near = 0.1, far = 100 } = options;

    this.canvas = canvas;
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;

    this.updateView();
    this.updateProjection();
  }

  /**
   * @returns {mat4}
   */
  updateView() {
    const phi = degreeToRadian(this.eulers[1]);
    const theta = degreeToRadian(this.eulers[2]);

    this.forward = [Math.cos(theta) * Math.cos(phi), Math.sin(theta) * Math.cos(phi), Math.sin(phi)];
    this.right = vec3.normalize(vec3.cross(this.forward, [0, 0, 1]));
    this.up = vec3.normalize(vec3.cross(this.right, this.forward));

    const target = vec3.add(this.position, this.forward);
    this.view = mat4.lookAt(this.position, target, this.up);

    return this.view;
  }

  /**
   * @returns {mat4}
   */
  updateProjection() {
    this.projection = mat4.perspective(this.fov, this.aspect, this.near, this.far);

    return this.projection;
  }

  /**
   *
   */
  update() {
    super.update();
    this.updateView();
    // this.updateProjection();
  }

  /**
   * @returns {Float32Array}
   */
  flatData() {
    const dy = Math.tan(Math.PI / 8);
    const dx = (dy * this.canvas.width) / this.canvas.height;

    return new Float32Array([
      this.forward[0],
      this.forward[1],
      this.forward[2],
      0.0,
      dx * this.right[0],
      dx * this.right[1],
      dx * this.right[2],
      0.0,
      dy * this.up[0],
      dy * this.up[1],
      dy * this.up[2],
      0.0,
    ]);
  }
}
