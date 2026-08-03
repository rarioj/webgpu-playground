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
   * @type {[number, number, number, number]}
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
   * @param {number} [options.near]
   * @param {number} [options.far]
   * @param {number} [options.verticalScale]
   * @param {number} [options.horizontalScale]
   */
  constructor(context, options = {}) {
    super();

    const {
      fov = Math.PI / 4,
      aspect = context.canvas.width / context.canvas.height,
      near = 0.01,
      far = 100,
      verticalScale = Math.tan(Math.PI / 8),
      horizontalScale = (verticalScale * context.canvas.width) / context.canvas.height,
    } = options;

    this.context = context;
    this.frustum = [fov, aspect, near, far];
    this.scaling = [verticalScale, horizontalScale];
    this.scaledRight = vec3.create();
    this.scaledUp = vec3.create();
    this.viewMatrix = mat4.create();
    this.projectionMatrix = mat4.create();
  }

  /**
   * @param {Object} [frustum]
   * @param {number} [frustum.fov]
   * @param {number} [frustum.aspect]
   * @param {number} [frustum.near]
   * @param {number} [frustum.far]
   * @returns {BaseCamera}
   */
  setFrustum(frustum = {}) {
    if (frustum.fov !== undefined) {
      this.frustum[0] = frustum.fov;
    }
    if (frustum.aspect !== undefined) {
      this.frustum[1] = frustum.aspect;
    }
    if (frustum.near !== undefined) {
      this.frustum[2] = frustum.near;
    }
    if (frustum.far !== undefined) {
      this.frustum[3] = frustum.far;
    }
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
    const projection = mat4.perspective(
      this.frustum[0], // fov
      this.frustum[1], // aspect
      this.frustum[2], // near
      this.frustum[3], // far
    );
    this.projectionMatrix.set(projection);
    return this;
  }
}
