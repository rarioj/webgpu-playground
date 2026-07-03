import { Sphere } from "./Sphere.js";
import { Camera } from "./Camera.js";
import { getRandomBetween } from "./library/helper/utility.js";

/**
 * @classdesc
 */
export class Scene {
  /**
   * @type {Sphere[]}
   */
  spheres;

  /**
   * @type {Camera}
   */
  camera;

  /**
   * @param {number} [sphereCount]
   */
  constructor(sphereCount = 32) {
    this.spheres = new Array(sphereCount);
    for (let i = 0; i < this.spheres.length; i++) {
      this.spheres[i] = new Sphere(
        [getRandomBetween(-50.0, 100.0), getRandomBetween(-50.0, 100.0), getRandomBetween(-50.0, 100.0)],
        [getRandomBetween(0.1, 0.9), getRandomBetween(0.1, 0.9), getRandomBetween(0.1, 0.9)],
        getRandomBetween(0.1, 2.9),
      );
    }

    this.camera = new Camera();
    this.camera.setPosition(-30.0, 0.0, 0.0);
  }
}
