import { vec3 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";
import { Sphere } from "./Sphere.js";
import { Triangle } from "./Triangle.js";
import { Camera } from "./Camera.js";
import { getRandomBetween } from "./library/helper/utility.js";

/**
 * @typedef {Object} NodeObject
 * @param {vec3} minCorner
 * @param {number} leftChild
 * @param {vec3} maxCorner
 * @param {number} primitiveCount
 */

/**
 * @classdesc
 */
export class Scene {
  /**
   * @type {Camera}
   */
  camera;

  /**
   * @type {number}
   */
  sphereCount;

  /**
   * @type {number}
   */
  triangleCount;

  /**
   * @type {(Sphere|Triangle)[]}
   */
  objectList;

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
  objectIndices;

  /**
   * @param {number} [objectCount]
   */
  constructor(objectCount = 32) {
    this.camera = new Camera();
    this.camera.setPosition(-30.0, 0.0, 0.0);

    this.sphereCount = Math.floor(objectCount / 4);
    this.triangleCount = objectCount - this.sphereCount;

    this.objectList = new Array(objectCount);
    for (let i = 0; i < this.sphereCount; i++) {
      this.objectList[i] = new Sphere(
        // center
        [getRandomBetween(-50.0, 100.0), getRandomBetween(-50.0, 100.0), getRandomBetween(-50.0, 100.0)],
        // color
        [getRandomBetween(0.85, 1.0), getRandomBetween(0.85, 1.0), getRandomBetween(0.85, 1.0)],
        // radius
        getRandomBetween(0.1, 2.9),
      );
    }
    for (let i = this.sphereCount; i < objectCount; i++) {
      this.objectList[i] = new Triangle(
        // center
        [getRandomBetween(-50.0, 100.0), getRandomBetween(-50.0, 100.0), getRandomBetween(-50.0, 100.0)],
        // color
        [getRandomBetween(0.85, 1.0), getRandomBetween(0.85, 1.0), getRandomBetween(0.85, 1.0)],
        // offsets
        [
          [getRandomBetween(-3, 6), getRandomBetween(-3, 6), getRandomBetween(-3, 6)],
          [getRandomBetween(-3, 6), getRandomBetween(-3, 6), getRandomBetween(-3, 6)],
          [getRandomBetween(-3, 6), getRandomBetween(-3, 6), getRandomBetween(-3, 6)],
        ],
      );
    }

    this.objectIndices = new Array(objectCount);
    for (let i = 0; i < objectCount; i++) {
      this.objectIndices[i] = i;
    }

    this.nodes = new Array(2 * objectCount - 1);
    for (let i = 0; i < 2 * objectCount - 1; i++) {
      this.nodes[i] = {};
    }

    const rootNode = this.nodes[0];
    rootNode.leftChild = 0;
    rootNode.primitiveCount = objectCount;
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

    for (let i = 0; i < currentNode.primitiveCount; i++) {
      const objectInstance = this.objectList[this.objectIndices[currentNode.leftChild + i]];

      if (objectInstance instanceof Sphere) {
        const axis = [objectInstance.radius, objectInstance.radius, objectInstance.radius];
        const tempCorner = vec3.create();
        vec3.subtract(objectInstance.center, axis, tempCorner);
        vec3.min(currentNode.minCorner, tempCorner, currentNode.minCorner);
        vec3.add(objectInstance.center, axis, tempCorner);
        vec3.max(currentNode.maxCorner, tempCorner, currentNode.maxCorner);
      } else if (objectInstance instanceof Triangle) {
        objectInstance.corners.forEach((corner) => {
          vec3.min(currentNode.minCorner, corner, currentNode.minCorner);
          vec3.max(currentNode.maxCorner, corner, currentNode.maxCorner);
        });
      }
    }
  }

  /**
   * @param {number} index
   */
  subdivide(index) {
    const currentNode = this.nodes[index];
    if (currentNode.primitiveCount <= 2) {
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
    let j = i + currentNode.primitiveCount - 1;

    while (i <= j) {
      if (this.objectList[this.objectIndices[i]].center[axis] < splitPosition) {
        i++;
      } else {
        const temp = this.objectIndices[i];
        this.objectIndices[i] = this.objectIndices[j];
        this.objectIndices[j] = temp;
        j--;
      }
    }

    const leftCount = i - currentNode.leftChild;
    if (leftCount === 0 || leftCount === currentNode.primitiveCount) {
      return;
    }

    const leftChildIndex = this.nodeUsed++;
    const rightChildIndex = this.nodeUsed++;

    this.nodes[leftChildIndex].leftChild = currentNode.leftChild;
    this.nodes[leftChildIndex].primitiveCount = leftCount;
    this.nodes[rightChildIndex].leftChild = i;
    this.nodes[rightChildIndex].primitiveCount = currentNode.primitiveCount - leftCount;

    currentNode.leftChild = leftChildIndex;
    currentNode.primitiveCount = 0;

    this.updateBounds(leftChildIndex);
    this.updateBounds(rightChildIndex);
    this.subdivide(leftChildIndex);
    this.subdivide(rightChildIndex);
  }
}
