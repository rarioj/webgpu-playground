import { BaseCamera } from "./BaseCamera.js";
import { addDebugElement } from "../helper/elements.js";

import { vec3 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

/**
 * @classdesc
 */
export class FirstPersonCamera extends BaseCamera {
  /**
   * @type {boolean}
   */
  flipX;

  /**
   * @type {boolean}
   */
  flipY;

  /**
   * @type {number}
   */
  moveSpeed;

  /**
   * @type {number}
   */
  orientSpeed;

  /**
   * @type {HTMLElement}
   */
  pointerLockElement;

  /**
   * @type {{ forward: number, right: number, up: number }}
   */
  movements;

  /**
   * @type {boolean}
   */
  mouseIsDragging;

  /**
   * @type {HTMLElement}
   */
  debugKeypress;

  /**
   * @type {HTMLElement}
   */
  debugMousemove;

  /**
   * @type {{Object.<string, string>}}
   */
  debugKeystacks;

  /**
   * @type {number}
   */
  debugMousetimer;

  /**
   * @param {Object} [options]
   * @param {boolean} [options.flipX]
   * @param {boolean} [options.flipY]
   * @param {number} [options.moveSpeed]
   * @param {number} [options.orientSpeed]
   * @param {HTMLElement} [options.pointerLockElement]
   */
  constructor(options = {}) {
    super(options);

    const { flipX = false, flipY = false, moveSpeed = 0.02, orientSpeed = 1, pointerLockElement = this.canvas } = options;

    this.flipX = flipX;
    this.flipY = flipY;
    this.moveSpeed = moveSpeed;
    this.orientSpeed = orientSpeed;
    this.pointerLockElement = pointerLockElement;
    this.movements = { forward: 0, right: 0, up: 0 };
    this.mouseIsDragging = false;

    this.setupControl();

    if (this.debug) {
      this.debugKeypress = addDebugElement({ label: "⌨" }).inner;
      this.debugMousemove = addDebugElement({ label: "🖱" }).inner;
      this.debugKeystacks = {};
    }
  }

  /**
   *
   */
  setupControl() {
    const boundKeydown = this.keydown.bind(this);
    const boundKeyup = this.keyup.bind(this);
    const boundMousemove = this.mousemove.bind(this);
    const boundMousedrag = this.mousedrag.bind(this);

    window.addEventListener("keydown", boundKeydown);
    window.addEventListener("keyup", boundKeyup);

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
      this.pointerLockElement.addEventListener("pointerdown", boundMousedrag);
      this.pointerLockElement.addEventListener("pointermove", boundMousedrag);
      this.pointerLockElement.addEventListener("pointerup", boundMousedrag);
      this.pointerLockElement.addEventListener("pointercancel", boundMousedrag);
    }
  }

  /**
   *
   */
  move() {
    vec3.add(this.position, vec3.mulScalar(this.forward, this.movements.forward), this.position);
    vec3.add(this.position, vec3.mulScalar(this.right, this.movements.right), this.position);
  }

  /**
   * @param {KeyboardEvent} event
   */
  keydown(event) {
    if (event.code == "KeyW") {
      this.movements.forward = this.moveSpeed;
    }
    if (event.code == "KeyS") {
      this.movements.forward = -this.moveSpeed;
    }
    if (event.code == "KeyA") {
      this.movements.right = -this.moveSpeed;
    }
    if (event.code == "KeyD") {
      this.movements.right = this.moveSpeed;
    }

    if (this.debug) {
      this.debugKeystacks[event.code] = event.code;
      this.debugKeypress.innerText = Object.values(this.debugKeystacks).join("+");
    }
  }

  /**
   * @param {KeyboardEvent} event
   */
  keyup(event) {
    if (event.code == "KeyW") {
      this.movements.forward = 0;
    }
    if (event.code == "KeyS") {
      this.movements.forward = 0;
    }
    if (event.code == "KeyA") {
      this.movements.right = 0;
    }
    if (event.code == "KeyD") {
      this.movements.right = 0;
    }

    if (this.debug) {
      delete this.debugKeystacks[event.code];
      this.debugKeypress.innerText = Object.values(this.debugKeystacks).join("+");
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  orient(x, y) {
    this.eulers[1] = Math.min(89, Math.max(-89, this.eulers[1] - y * this.orientSpeed));
    this.eulers[2] -= x * this.orientSpeed;
    this.eulers[2] %= 360;
  }

  /**
   * @param {MouseEvent} event
   */
  mousemove(event) {
    const moveX = this.flipX ? -event.movementX : event.movementX;
    const moveY = this.flipY ? -event.movementY : event.movementY;
    this.orient(moveX / 5, moveY / 5);

    if (this.debug) {
      this.debugMousemove.innerText = `${moveX.toFixed(1)}x${moveY.toFixed(1)}`;
      clearTimeout(this.debugMousetimer);
      this.debugMousetimer = setTimeout(() => {
        this.debugMousemove.innerText = "";
      }, 100);
    }
  }

  /**
   * @param {MouseEvent} event
   */
  mousedrag(event) {
    switch (event.type) {
      case "pointerup":
      case "pointercancel":
        if (!this.mouseIsDragging) {
          return;
        }
        this.mouseIsDragging = false;
        this.movements.forward = 0;
        this.pointerLockElement.releasePointerCapture(event.pointerId);
        break;
      case "pointerdown":
        this.mouseIsDragging = true;
        this.movements.forward = this.moveSpeed;
        this.pointerLockElement.setPointerCapture(event.pointerId);
        break;
      case "pointermove":
        if (!this.mouseIsDragging) {
          return;
        }
        this.mousemove(event);
        break;
      default:
        break;
    }
  }

  /**
   *
   */
  update() {
    super.update();
    this.move();
  }
}
