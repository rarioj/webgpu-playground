import { vec3 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";
import { Sphere } from "./Sphere.js";
import { Camera } from "./Camera.js";
import { getRandomBetween } from "./library/helper/utility.js";

/**
 * @typedef {Object} NodeObject
 * @param {vec3} minCorner
 * @param {number} leftChild
 * @param {vec3} maxCorner
 * @param {number} sphereCount
 */

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
   * @type {NodeObject[]}
   */
  nodes;

  /**
   * @type {number}
   */
  nodeUsed = 0;

  /**
   * @type {number[]}
   */
  sphereIndices;

  /**
   * @type {number}
   */
  sphereCount;

  /**
   * @param {number} [sphereCount]
   */
  constructor(sphereCount = 32) {
    this.sphereCount = sphereCount;

    this.spheres = new Array(this.sphereCount);
    for (let i = 0; i < this.spheres.length; i++) {
      this.spheres[i] = new Sphere(
        [getRandomBetween(-50.0, 100.0), getRandomBetween(-50.0, 100.0), getRandomBetween(-50.0, 100.0)],
        [getRandomBetween(0.1, 0.9), getRandomBetween(0.1, 0.9), getRandomBetween(0.1, 0.9)],
        getRandomBetween(0.1, 2.9),
      );
    }

    this.camera = new Camera();
    this.camera.setPosition(-30.0, 0.0, 0.0);

    this.sphereIndices = new Array(this.spheres.length);
    for (let i = 0; i < this.spheres.length; i++) {
      this.sphereIndices[i] = i;
    }

    this.nodes = new Array(2 * this.spheres.length - 1);
    for (let i = 0; i < 2 * this.spheres.length - 1; i++) {
      this.nodes[i] = {};
    }

    const rootNode = this.nodes[0];
    rootNode.leftChild = 0;
    rootNode.sphereCount = this.sphereCount;
    this.nodeUsed++;

    this.updateBounds(0);
    this.subdivide(0);
  }

  /**
   * @param {number} index
   */
  updateBounds(index) {
    const currentNode = this.nodes[index];
    currentNode.minCorner = [999999, 999999, 999999];
    currentNode.maxCorner = [-999999, -999999, -999999];

    for (let i = 0; i < currentNode.sphereCount; i++) {
      const sphere = this.spheres[this.sphereIndices[currentNode.leftChild + i]];
      const axis = [sphere.radius, sphere.radius, sphere.radius];

      const temp = vec3.create();
      vec3.subtract(sphere.center, axis, temp);
      vec3.min(currentNode.minCorner, temp, currentNode.minCorner);
      vec3.add(sphere.center, axis, temp);
      vec3.max(currentNode.maxCorner, temp, currentNode.maxCorner);
    }
  }

  /**
   * @param {number} index
   */
  subdivide(index) {
    const currentNode = this.nodes[index];
    if (currentNode.sphereCount <= 2) {
      return;
    }

    const extent = vec3.subtract(currentNode.maxCorner, currentNode.minCorner);
    let axis = 0;
    if (extent[1] > extent[axis]) {
      axis = 1;
    }
    if (extent[2] > extent[axis]) {
      axis = 2;
    }

    const splitPosition = currentNode.minCorner[axis] + extent[axis] / 2;
    let i = currentNode.leftChild;
    let j = i + currentNode.sphereCount - 1;

    while (i <= j) {
      if (this.spheres[this.sphereIndices[i]].center[axis] < splitPosition) {
        i++;
      } else {
        const temp = this.sphereIndices[i];
        this.sphereIndices[i] = this.sphereIndices[j];
        this.sphereIndices[j] = temp;
        j--;
      }
    }

    const leftCount = i - currentNode.leftChild;
    if (leftCount === 0 || leftCount === currentNode.sphereCount) {
      return;
    }

    const leftChildIndex = this.nodeUsed++;
    const rightChildIndex = this.nodeUsed++;

    this.nodes[leftChildIndex].leftChild = currentNode.leftChild;
    this.nodes[leftChildIndex].sphereCount = leftCount;
    this.nodes[rightChildIndex].leftChild = i;
    this.nodes[rightChildIndex].sphereCount = currentNode.sphereCount - leftCount;

    currentNode.leftChild = leftChildIndex;
    currentNode.sphereCount = 0;

    this.updateBounds(leftChildIndex);
    this.updateBounds(rightChildIndex);
    this.subdivide(leftChildIndex);
    this.subdivide(rightChildIndex);
  }
}
