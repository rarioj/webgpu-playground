import { mat4, vec3 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";
import { convertDegreeToRadian, createDebugElement } from "../helper/utility.js";

/**
 * @classdesc
 */
export class FirstPersonCamera {
  /**
   * @type {HTMLCanvasElement}
   */
  canvas = null;

  /**
   * @type {mat4}
   */
  projection = null;

  /**
   * @type {vec3}
   */
  position = [0, 0, 0];

  /**
   * @type {vec3}
   */
  eulers = [0, 0, 0];

  /**
   * @type {{ forward: number, right: number, up: number }}
   */
  movements = { forward: 0, right: 0, up: 0 };

  /**
   * @type {mat4}
   */
  view = null;

  /**
   * @type {vec3}
   */
  forward = null;

  /**
   * @type {vec3}
   */
  right = null;

  /**
   * @type {vec3}
   */
  up = null;

  /**
   * @type {Object}
   */
  keypresses = {};

  /**
   * @type {HTMLElement}
   */
  debugKeyPress = null;

  /**
   * @type {HTMLElement}
   */
  debugMouseMove = null;

  /**
   * @type {number}
   */
  debugMouseTimer = 0;

  /**
   * @type {boolean}
   */
  mouseIsDragging = false;

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} [options]
   * @param {number} [options.fov]
   * @param {number} [options.aspect]
   * @param {number} [options.near]
   * @param {number} [options.far]
   * @param {boolean} [options.debug]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;

    const { fov, aspect, near, far, debug } = {
      ...{
        fov: Math.PI / 4,
        aspect: this.canvas.width / this.canvas.height,
        near: 0.1,
        far: 10,
        debug: true,
      },
      ...options,
    };
    this.projection = mat4.perspective(fov, aspect, near, far);

    const boundKeydownEvent = this.keydown.bind(this);
    const boundKeyupEvent = this.keyup.bind(this);
    const boundMousemoveEvent = this.mousemove.bind(this);
    const boundMousedragEvent = this.mousedrag.bind(this);

    window.addEventListener("keydown", boundKeydownEvent);
    window.addEventListener("keyup", boundKeyupEvent);

    if ("requestPointerLock" in this.canvas) {
      this.canvas.addEventListener("click", () => {
        this.canvas.requestPointerLock();
      });
      document.addEventListener("pointerlockchange", () => {
        if (document.pointerLockElement === this.canvas) {
          document.addEventListener("mousemove", boundMousemoveEvent);
        } else {
          document.removeEventListener("mousemove", boundMousemoveEvent);
        }
      });
    } else {
      this.canvas.addEventListener("pointerdown", boundMousedragEvent);
      this.canvas.addEventListener("pointermove", boundMousedragEvent);
      this.canvas.addEventListener("pointerup", boundMousedragEvent);
      this.canvas.addEventListener("pointercancel", boundMousedragEvent);
    }

    if (debug) {
      this.debugKeyPress = createDebugElement({ label: "⌨ " }).inner;
      this.debugMouseMove = createDebugElement({ label: "🖱 " }).inner;
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  orient(x, y) {
    this.eulers[1] = Math.min(89, Math.max(-89, this.eulers[1] - y));
    this.eulers[2] -= x;
    this.eulers[2] %= 360;
  }

  /**
   *
   */
  move() {
    vec3.add(this.position, vec3.mulScalar(this.forward, this.movements.forward), this.position);
    vec3.add(this.position, vec3.mulScalar(this.right, this.movements.right), this.position);
  }

  /**
   * @param {number} [x]
   * @param {number} [y]
   * @param {number} [z]
   */
  setPosition(x = 0, y = 0, z = 0) {
    this.position = [x, y, z];
  }

  /**
   * @param {number} [x]
   * @param {number} [y]
   * @param {number} [z]
   */
  setEulers(x = 0, y = 0, z = 0) {
    this.eulers = [x, y, z];
  }

  /**
   * @param {KeyboardEvent} event
   */
  keydown(event) {
    if (event.code == "KeyW") {
      this.movements.forward = 0.02;
    }
    if (event.code == "KeyS") {
      this.movements.forward = -0.02;
    }
    if (event.code == "KeyA") {
      this.movements.right = -0.02;
    }
    if (event.code == "KeyD") {
      this.movements.right = 0.02;
    }

    if (this.debugKeyPress) {
      this.keypresses[event.code] = event.code;
      this.debugKeyPress.innerText = Object.values(this.keypresses).join(", ");
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

    if (this.debugKeyPress) {
      delete this.keypresses[event.code];
      this.debugKeyPress.innerText = Object.values(this.keypresses).join(", ");
    }
  }

  /**
   * @param {MouseEvent} event
   */
  mousemove(event) {
    this.orient(event.movementX / 5, event.movementY / 5);

    if (this.debugMouseMove) {
      this.debugMouseMove.innerText = `${event.movementX} x ${event.movementY}`;

      clearTimeout(this.debugMouseTimer);
      this.debugMouseTimer = setTimeout(() => {
        this.debugMouseMove.innerText = "";
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
        this.canvas.releasePointerCapture(event.pointerId);
        break;
      case "pointerdown":
        this.mouseIsDragging = true;
        this.movements.forward = 0.02;
        this.canvas.setPointerCapture(event.pointerId);
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
    const phi = convertDegreeToRadian(this.eulers[1]);
    const theta = convertDegreeToRadian(this.eulers[2]);

    this.forward = [
      Math.cos(theta) * Math.cos(phi), // cos(theta) * cos(phi)
      Math.sin(theta) * Math.cos(phi), // sin(theta) * cos(phi)
      Math.sin(phi), // sin(phi)
    ];
    this.right = vec3.normalize(vec3.cross(this.forward, [0, 0, 1]));
    this.up = vec3.normalize(vec3.cross(this.right, this.forward));

    const target = vec3.add(this.position, this.forward);
    this.view = mat4.lookAt(this.position, target, this.up);

    this.move();
  }
}
