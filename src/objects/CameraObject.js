import { BaseObject } from "./BaseObject.js";

import { vec3, mat4 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
export class CameraObject extends BaseObject {
  /**
   * @type {GPUCanvasContext}
   */
  context;

  /**
   * @type {{fov: number, aspect: number, left: number, right: number, bottom: number, top: number, near: number, far: number, orthographic: boolean}}
   */
  frustum;

  /**
   * @type {[number, number]}
   */
  scaling;

  /**
   * @type {vec3}
   */
  scaledRight;

  /**
   * @type {vec3}
   */
  scaledUp;

  /**
   * @type {mat4}
   */
  viewMatrix;

  /**
   * @type {mat4}
   */
  projectionMatrix;

  /**
   * @param {GPUCanvasContext} context
   * @param {Object} [options]
   * @param {number} [options.fov]
   * @param {number} [options.aspect]
   * @param {number} [options.left]
   * @param {number} [options.right]
   * @param {number} [options.bottom]
   * @param {number} [options.top]
   * @param {number} [options.near]
   * @param {number} [options.far]
   * @param {number} [options.orthographic]
   * @param {number} [options.verticalScale]
   * @param {number} [options.horizontalScale]
   */
  constructor(context, options = {}) {
    super();

    const {
      fov = Math.PI / 4,
      aspect = context.canvas.width / context.canvas.height,
      left = context.canvas.width * -0.1,
      right = context.canvas.width * 0.1,
      bottom = context.canvas.height * -0.1,
      top = context.canvas.height * 0.1,
      near = 0.01,
      far = 100,
      orthographic = false,
      verticalScale = Math.tan(Math.PI / 8),
      horizontalScale = (verticalScale * context.canvas.width) / context.canvas.height,
    } = options;

    this.context = context;
    this.frustum = { fov, aspect, left, right, bottom, top, near, far, orthographic };
    this.scaling = [verticalScale, horizontalScale];
    this.scaledRight = vec3.create();
    this.scaledUp = vec3.create();
    this.viewMatrix = mat4.create();
    this.projectionMatrix = mat4.create();
  }

  /**
   * @param {Object} [frustum]
   * @param {number} [options.fov]
   * @param {number} [options.aspect]
   * @param {number} [options.left]
   * @param {number} [options.right]
   * @param {number} [options.bottom]
   * @param {number} [options.top]
   * @param {number} [options.near]
   * @param {number} [options.far]
   * @param {number} [options.orthographic]
   * @returns {BaseCamera}
   */
  setFrustum(frustum = {}) {
    this.frustum = { ...this.frustum, ...frustum };
    return this;
  }

  /**
   * @param {Object} [scaling]
   * @param {number} [scaling.vScale]
   * @param {number} [scaling.hScale]
   * @returns {BaseCamera}
   */
  setScaling(scaling = {}) {
    if (scaling.vScale !== undefined) {
      this.scaling[0] = scaling.vScale;
    }
    if (scaling.hScale !== undefined) {
      this.scaling[1] = scaling.hScale;
    }
    return this;
  }

  /**
   * @returns {BaseCamera}
   */
  updateOrthonormalVectors() {
    super.updateOrthonormalVectors();
    this.scaledRight[0] = this.scaling[1] * this.right[0];
    this.scaledRight[1] = this.scaling[1] * this.right[1];
    this.scaledRight[2] = this.scaling[1] * this.right[2];
    this.scaledUp[0] = this.scaling[0] * this.up[0];
    this.scaledUp[1] = this.scaling[0] * this.up[1];
    this.scaledUp[2] = this.scaling[0] * this.up[2];
    return this;
  }

  /**
   * @returns {BaseCamera}
   */
  updateViewMatrix() {
    const target = vec3.add(this.position, this.forward);
    const view = mat4.lookAt(this.position, target, this.up);
    this.viewMatrix.set(view);
    return this;
  }

  /**
   * @returns {BaseCamera}
   */
  updateProjectionMatrix() {
    const projection = this.frustum.orthographic
      ? mat4.ortho(this.frustum.left, this.frustum.right, this.frustum.bottom, this.frustum.top, this.frustum.near, this.frustum.far)
      : mat4.perspective(this.frustum.fov, this.frustum.aspect, this.frustum.near, this.frustum.far);
    this.projectionMatrix.set(projection);
    return this;
  }
}
