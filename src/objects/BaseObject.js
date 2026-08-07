import { degreeToRadian } from "../utilities/maths.js";

import { vec3, mat4 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
export class BaseObject {
  /**
   * @type {[number, number, number]}
   */
  position;

  /**
   * @type {[number, number, number]}
   */
  eulers;

  /**
   * @type {[number, number, number]}
   */
  scale;

  /**
   * @type {[number, number, number]}
   */
  movements;

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
   * @type {Array.<function(): void>}
   */
  updateCallbacks;

  /**
   * @type {mat4}
   */
  modelMatrix;

  /**
   *
   */
  constructor() {
    this.position = [0, 0, 0];
    this.eulers = [0, 0, 0];
    this.scale = [1, 1, 1];
    this.movements = [0, 0, 0];
    this.forward = vec3.create();
    this.right = vec3.create();
    this.up = vec3.create(0, 1, 0);
    this.updateCallbacks = [];
    this.modelMatrix = mat4.create();
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {BaseObject}
   */
  setPosition(x, y, z) {
    this.position[0] = x;
    this.position[1] = y;
    this.position[2] = z;
    return this;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {BaseObject}
   */
  setEulers(x, y, z) {
    this.eulers[0] = x;
    this.eulers[1] = y;
    this.eulers[2] = z;
    return this;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {BaseObject}
   */
  setScale(x, y, z) {
    this.scale[0] = x;
    this.scale[1] = y;
    this.scale[2] = z;
    return this;
  }

  /**
   * @param {number} forward
   * @param {number} right
   * @param {number} up
   * @returns {BaseObject}
   */
  setMovements(forward, right, up) {
    this.movements[0] = forward;
    this.movements[1] = right;
    this.movements[2] = up;
    return this;
  }

  /**
   * @returns {BaseObject}
   */
  updateOrthonormalVectors() {
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
    return this;
  }

  /**
   * @returns {BaseObject}
   */
  updateModelMatrix() {
    const transform = mat4.identity();
    mat4.translate(transform, this.position, transform);
    mat4.rotateX(transform, degreeToRadian(this.eulers[0]), transform);
    mat4.rotateY(transform, degreeToRadian(this.eulers[1]), transform);
    mat4.rotateZ(transform, degreeToRadian(this.eulers[2]), transform);
    mat4.multiply(transform, mat4.scaling(this.scale), transform);
    this.modelMatrix.set(transform);
    return this;
  }

  /**
   * @param {function(): void} callback
   * @returns {BaseObject}
   */
  addUpdateCallback(callback) {
    this.updateCallbacks.push(callback);
    return this;
  }

  /**
   * @returns {BaseObject}
   */
  update() {
    for (let i = 0; i < this.updateCallbacks.length; i++) {
      this.updateCallbacks[i]();
    }
    return this;
  }

  /**
   * @returns {BaseObject}
   */
  move() {
    const forward = vec3.mulScalar(this.forward, this.movements[0]);
    const right = vec3.mulScalar(this.right, this.movements[1]);
    const up = vec3.mulScalar(this.up, this.movements[2]);

    vec3.add(this.position, forward, this.position);
    vec3.add(this.position, right, this.position);
    vec3.add(this.position, up, this.position);
    return this;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {BaseObject}
   */
  lookAt(x, y) {
    this.eulers[1] = Math.min(89, Math.max(-89, this.eulers[1] - y));
    this.eulers[2] -= x;
    this.eulers[2] %= 360;
    return this;
  }
}
