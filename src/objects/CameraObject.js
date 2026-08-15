import { BaseObject } from "./BaseObject.js";

import { vec3, mat4 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
export class CameraObject extends BaseObject {
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
   * @param {Object} [options]
   * @param {number} [options.width]
   * @param {number} [options.height]
   * @param {number} [options.fov]
   * @param {number} [options.aspect]
   * @param {number} [options.orthographic]
   * @param {number} [options.left]
   * @param {number} [options.right]
   * @param {number} [options.bottom]
   * @param {number} [options.top]
   * @param {number} [options.near]
   * @param {number} [options.far]
   * @param {number} [options.verticalScale]
   * @param {number} [options.horizontalScale]
   */
  constructor(options = {}) {
    const {
      width = 800,
      height = 600,
      fov = Math.PI / 4,
      aspect = width / height,
      orthographic = 0,
      left = orthographic * aspect * -0.5,
      right = orthographic * aspect * 0.5,
      bottom = orthographic * -0.5,
      top = orthographic * 0.5,
      near = 0.01,
      far = 100,
      verticalScale = Math.tan(Math.PI / 8),
      horizontalScale = (verticalScale * width) / height,
    } = options;

    super({ width, height, fov, aspect, orthographic, left, right, bottom, top, near, far, verticalScale, horizontalScale });

    this.scaledRight = vec3.create();
    this.scaledUp = vec3.create();
    this.viewMatrix = mat4.create();
    this.projectionMatrix = mat4.create();
  }

  /**
   * @returns {BaseCamera}
   */
  updateOrthonormalVectors() {
    super.updateOrthonormalVectors();
    this.scaledRight[0] = this.attributes.horizontalScale * this.right[0];
    this.scaledRight[1] = this.attributes.horizontalScale * this.right[1];
    this.scaledRight[2] = this.attributes.horizontalScale * this.right[2];
    this.scaledUp[0] = this.attributes.verticalScale * this.up[0];
    this.scaledUp[1] = this.attributes.verticalScale * this.up[1];
    this.scaledUp[2] = this.attributes.verticalScale * this.up[2];
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
    const projection = this.attributes.orthographic
      ? mat4.ortho(this.attributes.left, this.attributes.right, this.attributes.bottom, this.attributes.top, this.attributes.near, this.attributes.far)
      : mat4.perspective(this.attributes.fov, this.attributes.aspect, this.attributes.near, this.attributes.far);
    this.projectionMatrix.set(projection);
    return this;
  }

  /**
   * @param {number} width
   * @param {number} height
   * @returns {BaseCamera}
   */
  resize(width, height) {
    super.resize(width, height);
    this.attributes.width = width;
    this.attributes.height = height;
    this.attributes.aspect = width / height;
    this.attributes.left = this.attributes.orthographic * this.attributes.aspect * -0.5;
    this.attributes.right = this.attributes.orthographic * this.attributes.aspect * 0.5;
    this.attributes.horizontalScale = (this.attributes.verticalScale * width) / height;
    this.updateProjectionMatrix();
    return this;
  }
}
