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
        [getRandomBetween(3.0, 7.0), getRandomBetween(-5.0, 10.0), getRandomBetween(-5.0, 10.0)],
        [getRandomBetween(0.3, 0.7), getRandomBetween(0.3, 0.7), getRandomBetween(0.3, 0.7)],
        getRandomBetween(0.1, 1.9),
      );
    }

    this.camera = new Camera();
    this.camera.setPosition(-20.0, 0.0, 0.0);
  }
}
