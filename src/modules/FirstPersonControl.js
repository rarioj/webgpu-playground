import { CameraObject } from "../objects/CameraObject.js";
import { KeyboardControl } from "./KeyboardControl.js";
import { MouseTouchControl } from "./MouseTouchControl.js";

/**
 * @classdesc
 */
export class FirstPersonControl {
  /**
   * @type {CameraObject}
   */
  camera;

  /**
   * @type {KeyboardControl}
   */
  keyboardControl;

  /**
   * @type {MouseTouchControl}
   */
  mouseTouchControl;

  /**
   * @param {CameraObject} camera
   * @param {HTMLElement} element
   * @param {Object} [options]
   * @param {boolean} [options.debug]
   * @param {number} [options.moveSpeed]
   * @param {number} [options.orientSpeed]
   * @param {boolean} [options.flipX]
   * @param {boolean} [options.flipY]
   */
  constructor(camera, element, options = {}) {
    const { debug = false, moveSpeed = 1.0, orientSpeed = 1.0, flipX = false, flipY = false } = options;

    this.camera = camera;
    this.keyboardControl = new KeyboardControl(camera, { debug, speed: moveSpeed });
    this.mouseTouchControl = new MouseTouchControl(camera, element, { debug, orientSpeed, moveSpeed, flipX, flipY });
  }
}
