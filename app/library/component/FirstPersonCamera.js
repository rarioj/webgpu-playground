import { vec3, mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";
import { convertDegreeToRadian } from "../helper/utility.js";

export class FirstPersonCamera {
  /**
   * @type {vec3}
   */
  position;

  /**
   * @type {vec3}
   */
  eulers;

  /**
   * @type {mat4}
   */
  projection;

  /**
   * @type {{ forward: number, right: number, up: number }}
   */
  movements;

  /**
   * @type {mat4}
   */
  view;

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
   * @type {HTMLElement}
   */
  pointerLockElement;

  /**
   * @type {Object}
   */
  keypresses;

  /**
   * @type {HTMLElement}
   */
  debugKeyPress;

  /**
   * @type {HTMLElement}
   */
  debugMouseMove;

  /**
   * @param {Object} [projection]
   * @param {number} [projection.fov]
   * @param {number} [projection.aspect]
   * @param {number} [projection.near]
   * @param {number} [projection.far]
   * @param {Object} [options]
   * @param {HTMLElement} [options.pointerLockElement]
   * @param {HTMLElement} [options.debugKeyPress]
   * @param {HTMLElement} [options.debugMouseMove]
   */
  constructor(projection = {}, options = {}) {
    const { fov = Math.PI / 4, aspect = 400 / 300, near = 0.1, far = 10 } = projection;
    this.position = [0, 0, 0];
    this.eulers = [0, 0, 0];
    this.projection = mat4.perspective(fov, aspect, near, far);
    this.movements = { forward: 0, right: 0, up: 0 };

    this.pointerLockElement = options.pointerLockElement ? options.pointerLockElement : null;
    this.keypresses = {};
    this.debugKeyPress = options.debugKeyPress ? options.debugKeyPress : null;
    this.debugMouseMove = options.debugMouseMove ? options.debugMouseMove : null;

    const boundKeydownEvent = this.keydown.bind(this);
    const boundKeyupEvent = this.keyup.bind(this);
    const boundMousemoveEvent = this.mousemove.bind(this);

    window.addEventListener("keydown", boundKeydownEvent);
    window.addEventListener("keyup", boundKeyupEvent);

    if (this.pointerLockElement) {
      this.pointerLockElement.addEventListener("click", () => {
        this.pointerLockElement.requestPointerLock();
      });

      document.addEventListener("pointerlockchange", () => {
        if (document.pointerLockElement === this.pointerLockElement) {
          document.addEventListener("mousemove", boundMousemoveEvent);
        } else {
          document.removeEventListener("mousemove", boundMousemoveEvent);
        }
      });
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
      this.debugKeyPress.innerText = Object.values(this.keypresses).join(" ");
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
      this.debugKeyPress.innerText = Object.values(this.keypresses).join(" ");
    }
  }

  /**
   * @param {MouseEvent} event
   */
  mousemove(event) {
    this.orient(event.movementX / 5, event.movementY / 5);

    if (this.debugMouseMove) {
      this.debugMouseMove.innerText = `${event.movementX} x ${event.movementY}`;
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
    this.right = vec3.cross(this.forward, [0, 0, 1]);
    this.up = vec3.cross(this.right, this.forward);

    const target = vec3.add(this.position, this.forward);
    this.view = mat4.lookAt(this.position, target, this.up);

    this.move();
  }
}
