import { BaseCamera } from "./BaseCamera.js";
import { addDebugElement } from "../helper/elements.js";

import { vec3 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
export class FirstPersonCamera extends BaseCamera {
  /**
   * @type {[number, number]} vertical, horizontal
   */
  scaling;

  /**
   * @type {[boolean, boolean]} x, y
   */
  flip;

  /**
   * @type {[number, number]} move, orient
   */
  speed;

  /**
   * @type {HTMLElement}
   */
  pointerLockElement;

  /**
   * @type {vec3}
   */
  scaledRight;

  /**
   * @type {vec3}
   */
  scaledUp;

  /**
   * @type {{ forward: number, right: number, up: number, drag: boolean }}
   */
  movements;

  /**
   * @param {Object} [options]
   * @param {number} [options.verticalScaling]
   * @param {number} [options.horizontalScaling]
   * @param {boolean} [options.flipX]
   * @param {boolean} [options.flipY]
   * @param {number} [options.moveSpeed]
   * @param {number} [options.orientSpeed]
   * @param {HTMLElement} [options.pointerLockElement]
   */
  constructor(options = {}) {
    super(options);

    const {
      verticalScaling = Math.tan(Math.PI / 8),
      horizontalScaling = (verticalScaling * this.canvas.width) / this.canvas.height,
      flipX = false,
      flipY = false,
      moveSpeed = 0.02,
      orientSpeed = 1,
      pointerLockElement = this.canvas,
    } = options;

    this.scaling = [verticalScaling, horizontalScaling];
    this.flip = [flipX, flipY];
    this.speed = [moveSpeed, orientSpeed];
    this.pointerLockElement = pointerLockElement;
    this.scaledRight = [0, 0, 0];
    this.scaledUp = [0, 0, 0];
    this.movements = { forward: 0, right: 0, up: 0, drag: false };

    if (this.attributes?.debug) {
      this.attributes.keypress = addDebugElement({ label: "⌨" }).inner;
      this.attributes.mousemove = addDebugElement({ label: "🖱" }).inner;
      this.attributes.keystacks = {};
      this.attributes.timer = 0;
    }

    this.setupControl();
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
      this.movements.forward = this.speed[0];
    }
    if (event.code == "KeyS") {
      this.movements.forward = -this.speed[0];
    }
    if (event.code == "KeyA") {
      this.movements.right = -this.speed[0];
    }
    if (event.code == "KeyD") {
      this.movements.right = this.speed[0];
    }

    if (this.attributes?.debug) {
      this.attributes.keystacks[event.code] = event.code;
      this.attributes.keypress.innerText = Object.values(this.attributes.keystacks).join("+");
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

    if (this.attributes?.debug) {
      delete this.attributes.keystacks[event.code];
      this.attributes.keypress.innerText = Object.values(this.attributes.keystacks).join("+");
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  orient(x, y) {
    this.eulers[1] = Math.min(89, Math.max(-89, this.eulers[1] - y * this.speed[1]));
    this.eulers[2] -= x * this.speed[1];
    this.eulers[2] %= 360;
  }

  /**
   * @param {MouseEvent} event
   */
  mousemove(event) {
    const moveX = this.flip[0] ? -event.movementX : event.movementX;
    const moveY = this.flip[1] ? -event.movementY : event.movementY;
    this.orient(moveX / 5, moveY / 5);

    if (this.attributes?.debug) {
      this.attributes.mousemove.innerText = `${moveX.toFixed(1)}x${moveY.toFixed(1)}`;
      clearTimeout(this.attributes.timer);
      this.attributes.timer = setTimeout(() => {
        this.attributes.mousemove.innerText = "";
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
        if (!this.movements.drag) {
          return;
        }
        this.movements.drag = false;
        this.movements.forward = 0;
        this.pointerLockElement.releasePointerCapture(event.pointerId);
        break;
      case "pointerdown":
        this.movements.drag = true;
        this.movements.forward = this.speed[0];
        this.pointerLockElement.setPointerCapture(event.pointerId);
        break;
      case "pointermove":
        if (!this.movements.drag) {
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
  scaleHorizontalVertical() {
    this.scaledRight[0] = this.scaling[1] * this.right[0];
    this.scaledRight[1] = this.scaling[1] * this.right[1];
    this.scaledRight[2] = this.scaling[1] * this.right[2];
    this.scaledUp[0] = this.scaling[0] * this.up[0];
    this.scaledUp[1] = this.scaling[0] * this.up[1];
    this.scaledUp[2] = this.scaling[0] * this.up[2];
  }

  /**
   *
   */
  update() {
    super.update();
    this.move();
    this.scaleHorizontalVertical();
  }
}
