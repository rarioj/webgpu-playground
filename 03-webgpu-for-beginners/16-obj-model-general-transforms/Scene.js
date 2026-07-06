import { vec3, mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";
import { Camera } from "./Camera.js";
import { getRandomBetween, parseObjCode, convertDegreeToRadian } from "./library/helper/utility.js";
import { BasicModel } from "./library/component/BasicModel.js";

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
  camera = null;

  /**
   * @type {BasicModel}
   */
  statueModel = null;

  /**
   * @type {number}
   */
  triangleCount = 0;

  /**
   * @type {{center: vec3, color: vec3, corners: vec3[], normals: vec3[]}[]}
   */
  objectList = [];

  /**
   * @type {number[]}
   */
  objectIndices = [];

  /**
   * @type {NodeObject[]}
   */
  nodes = [];

  /**
   * @type {number}
   */
  nodeUsed = 0;

  /**
   * @param {string} objCode
   */
  constructor(objCode) {
    this.camera = new Camera();
    this.camera.setPosition(-10, 0, 0);

    this.statueModel = new BasicModel();
    this.statueModel.setPosition(0, 0, 0);
    this.statueModel.setEulers(90, 90, 0);
    this.statueModel.init();
    this.statueModel.setUpdateCallback((obj) => {
      obj.eulers[1] += 4;
      obj.eulers[1] %= 360;
    });

    parseObjCode(
      objCode,
      {
        useTexture: false,
        preTransform: (() => {
          let transform = mat4.identity();
          transform = mat4.multiply(transform, mat4.scaling([0.15, 0.15, 0.15]));
          return transform;
        })(),
      },
      this.objectList,
    );
    this.triangleCount = this.objectList.length;

    this.objectIndices = new Array(this.triangleCount);
    for (let i = 0; i < this.triangleCount; i++) {
      this.objectIndices[i] = i;
    }

    this.nodes = new Array(2 * this.triangleCount - 1);
    for (let i = 0; i < 2 * this.triangleCount - 1; i++) {
      this.nodes[i] = {};
    }

    const rootNode = this.nodes[0];
    rootNode.leftChild = 0;
    rootNode.primitiveCount = this.triangleCount;
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
      objectInstance.corners.forEach((corner) => {
        currentNode.minCorner = vec3.min(currentNode.minCorner, corner);
        currentNode.maxCorner = vec3.max(currentNode.maxCorner, corner);
      });
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
