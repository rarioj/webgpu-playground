import { CameraObject } from "../objects/CameraObject.js";
import { createDebugElement } from "../utilities/elements.js";

/**
 * @classdesc
 */
export class KeyboardControl {
  /**
   * @type {CameraObject}
   */
  camera;

  /**
   * @type {number}
   */
  speed;

  /**
   * @type {Object.<string, string>}
   */
  keypresses;

  /**
   * @type {HTMLElement}
   */
  debugger;

  /**
   * @param {CameraObject} camera
   * @param {Object} [options]
   * @param {boolean} [options.debug]
   * @param {number} [options.speed]
   */
  constructor(camera, options = {}) {
    const { speed = 1.0, debug = false } = options;

    this.camera = camera;
    this.speed = speed;
    this.keypresses = {};

    this.debugger = undefined;
    if (debug) {
      this.debugger = createDebugElement({ label: "⌨" }).content;
    }

    const boundKeydown = this.keydown.bind(this);
    const boundKeyup = this.keyup.bind(this);
    window.addEventListener("keydown", boundKeydown);
    window.addEventListener("keyup", boundKeyup);
  }

  /**
   * @param {KeyboardEvent} event
   */
  keydown(event) {
    switch (event.code) {
      case "KeyW":
        this.camera.movements[0] = this.speed; // forward
        break;
      case "KeyA":
        this.camera.movements[1] = -this.speed; // left
        break;
      case "KeyS":
        this.camera.movements[0] = -this.speed; // backward
        break;
      case "KeyD":
        this.camera.movements[1] = this.speed; // right
        break;
      default:
        break;
    }

    this.keypresses[event.code] = event.code;
    if (this.debugger) {
      this.debugger.innerText = Object.values(this.keypresses).join("+");
    }
  }

  /**
   * @param {KeyboardEvent} event
   */
  keyup(event) {
    switch (event.code) {
      case "KeyW":
        this.camera.movements[0] = 0; // forward
        break;
      case "KeyA":
        this.camera.movements[1] = 0; // left
        break;
      case "KeyS":
        this.camera.movements[0] = 0; // backward
        break;
      case "KeyD":
        this.camera.movements[1] = 0; // right
        break;
      default:
        break;
    }

    delete this.keypresses[event.code];
    if (this.debugger) {
      this.debugger.innerText = Object.values(this.keypresses).join("+");
    }
  }
}
