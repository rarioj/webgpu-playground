import { BaseObject3D } from "./BaseObject3D.js";
import { degreeToRadian } from "../helper/maths.js";

import { vec3, mat4 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
export class BaseCamera extends BaseObject3D {
  /**
   * @type {HTMLCanvasElement}
   */
  canvas;

  /**
   * @type {[number, number, number, number]} fov, aspect, near, far
   */
  frustum;

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
    this.frustum = [fov, aspect, near, far];
    this.forward = [0, 0, 0];
    this.right = [0, 0, 0];
    this.up = [0, 0, 0];
    this.view = mat4.identity();
    this.projection = mat4.identity();

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
    const view = mat4.lookAt(this.position, target, this.up);
    this.view.set(view);
  }

  /**
   *
   */
  updateProjection() {
    const projection = mat4.perspective(
      this.frustum[0], // fov
      this.frustum[1], // aspect
      this.frustum[2], // near
      this.frustum[3], // far
    );
    this.projection.set(projection);
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
