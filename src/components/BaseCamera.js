import { BaseObject3D } from "./BaseObject3D.js";
import { degreeToRadian } from "../helper/maths.js";

import { vec3, mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

/**
 * @classdesc
 */
export class BaseCamera extends BaseObject3D {
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
    this.forward = [0, 0, 0];
    this.right = [0, 0, 0];
    this.up = [0, 0, 0];

    this.updateView();
    this.updateProjection();
  }

  /**
   *
   */
  updateView() {
    const phi = degreeToRadian(this.eulers[1]);
    const theta = degreeToRadian(this.eulers[2]);

    this.forward[0] = Math.cos(theta) * Math.cos(phi);
    this.forward[1] = Math.sin(theta) * Math.cos(phi);
    this.forward[2] = Math.sin(phi);

    const right = vec3.normalize(vec3.cross(this.forward, [0, 0, 1]));
    this.right[0] = right[0];
    this.right[1] = right[1];
    this.right[2] = right[2];

    const up = vec3.normalize(vec3.cross(this.right, this.forward));
    this.up[0] = up[0];
    this.up[1] = up[1];
    this.up[2] = up[2];

    const target = vec3.add(this.position, this.forward);
    this.view = mat4.lookAt(this.position, target, this.up);
  }

  /**
   *
   */
  updateProjection() {
    this.projection = mat4.perspective(this.fov, this.aspect, this.near, this.far);
  }

  /**
   *
   */
  update() {
    super.update();
    this.updateView();
    // this.updateProjection();
  }
}
