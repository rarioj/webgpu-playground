import { CameraObject } from "../objects/CameraObject.js";
import { createTweakElement } from "../utilities/elements.js";
import { roundToDecimal } from "../utilities/maths.js";

/**
 * @classdesc
 */
export class MouseTouchControl {
  /**
   * @type {CameraObject}
   */
  camera;

  /**
   * @type {HTMLElement}
   */
  pointerLockElement;

  /**
   * @type {number}
   */
  orientSpeed;

  /**
   * @type {number}
   */
  moveSpeed;

  /**
   * @type {{x: boolean, y: boolean}}
   */
  flip;

  /**
   * @type {boolean}
   */
  dragging;

  /**
   * @type {Object.<string, any>}
   */
  debugger;

  /**
   *
   * @param {CameraObject} camera
   * @param {HTMLElement} element
   * @param {Object} [options]
   * @param {boolean} [options.debug]
   * @param {number} [options.orientSpeed]
   * @param {number} [options.moveSpeed]
   * @param {boolean} [options.flipX]
   * @param {boolean} [options.flipY]
   */
  constructor(camera, element, options = {}) {
    const { orientSpeed = 1.0, moveSpeed = 1.0, flipX = false, flipY = false, debug = false } = options;

    this.camera = camera;
    this.pointerLockElement = element;
    this.orientSpeed = orientSpeed;
    this.moveSpeed = moveSpeed;
    this.flip = { x: flipX, y: flipY };
    this.dragging = false;
    this.debugger = debug ? createTweakElement("Mouse move", "", { readonly: true }) : { "Mouse move": "" };

    const boundMousemove = this.mousemove.bind(this);
    const boundTouchdrag = this.touchdrag.bind(this);

    if ("requestPointerLock" in this.pointerLockElement) {
      this.pointerLockElement.addEventListener("click", () => {
        this.pointerLockElement.requestPointerLock();
      });
      document.addEventListener("pointerlockchange", () => {
        if (document.pointerLockElement === this.pointerLockElement) {
          document.addEventListener("mousemove", boundMousemove);
        } else {
          document.removeEventListener("mousemove", boundMousemove);
        }
      });
    } else {
      this.pointerLockElement.addEventListener("pointerdown", boundTouchdrag);
      this.pointerLockElement.addEventListener("pointermove", boundTouchdrag);
      this.pointerLockElement.addEventListener("pointerup", boundTouchdrag);
      this.pointerLockElement.addEventListener("pointercancel", boundTouchdrag);
    }
  }

  /**
   * @param {MouseEvent} event
   */
  mousemove(event) {
    const x = this.flip.x ? -event.movementX : event.movementX;
    const y = this.flip.y ? -event.movementY : event.movementY;
    this.camera.lookAt(x * this.orientSpeed, y * this.orientSpeed);
    this.debugger["Mouse move"] = `${roundToDecimal(x, 1)}x${roundToDecimal(y, 1)}`;
  }

  /**
   * @param {PointerEvent} event
   */
  touchdrag(event) {
    event.preventDefault();

    switch (event.type) {
      case "pointerup":
      case "pointercancel":
        if (!this.dragging) {
          return;
        }
        this.dragging = false;
        this.camera.movements[0] = 0;
        this.pointerLockElement.releasePointerCapture(event.pointerId);
        break;
      case "pointerdown":
        this.dragging = true;
        this.camera.movements[0] = this.moveSpeed;
        this.pointerLockElement.setPointerCapture(event.pointerId);
        break;
      case "pointermove":
        if (!this.dragging) {
          return;
        }
        this.mousemove(event);
        break;
      default:
        break;
    }
  }
}
