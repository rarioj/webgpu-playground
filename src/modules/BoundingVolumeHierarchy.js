import { vec3 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
class BVHNode {
  /**
   * @type {Float32Array}
   */
  data;

  /**
   * @type {[number, number, number]}
   */
  minCorner;

  /**
   * @type {[number]}
   */
  leftChild;

  /**
   * @type {[number, number, number]}
   */
  maxCorner;

  /**
   * @type {[number]}
   */
  primitiveCount;

  /**
   * @param {[number, number, number]} minCorner
   * @param {[number, number, number]} maxCorner
   */
  constructor(minCorner = [Infinity, Infinity, Infinity], maxCorner = [-Infinity, -Infinity, -Infinity]) {
    this.data = new Float32Array(8);
    this.minCorner = this.data.subarray(0, 3);
    this.leftChild = this.data.subarray(3, 4);
    this.maxCorner = this.data.subarray(4, 7);
    this.primitiveCount = this.data.subarray(7, 8);

    this.minCorner[0] = minCorner[0];
    this.minCorner[1] = minCorner[1];
    this.minCorner[2] = minCorner[2];
    this.leftChild[0] = 0;
    this.maxCorner[0] = maxCorner[0];
    this.maxCorner[1] = maxCorner[1];
    this.maxCorner[2] = maxCorner[2];
    this.primitiveCount[0] = 0;
  }
}

/**
 * @classdesc
 */
export class BoundingVolumeHierarchy {
  /**
   * @type {BVHNode[]}
   */
  inputNodes;

  /**
   * @type {BVHNode[]}
   */
  outputNodes;

  /**
   * @type {Uint32Array}
   */
  indices;

  /**
   * @type {number}
   */
  assigned;

  /**
   * @type {number}
   */
  leafSize;

  /**
   * @param {number} leafSize
   */
  constructor(leafSize = 4) {
    this.inputNodes = [];
    this.outputNodes = [];
    this.indices = [];
    this.assigned = 0;
    this.leafSize = leafSize;
  }

  /**
   * @param {[[number, number, number], [number, number, number]]} corners
   */
  addNodeFromCorners(corners) {
    this.inputNodes.push(new BVHNode(corners[0], corners[1]));
  }

  /**
   * @param {[[number, number, number], [number, number, number], [number, number, number]]} vertices
   */
  addNodeFromVertices(vertices) {
    const minCorner = [Infinity, Infinity, Infinity];
    const maxCorner = [-Infinity, -Infinity, -Infinity];

    for (let i = 0; i < vertices.length; i++) {
      vec3.min(minCorner, vertices[i], minCorner);
      vec3.max(maxCorner, vertices[i], maxCorner);
    }

    this.inputNodes.push(new BVHNode(minCorner, maxCorner));
  }

  /**
   *
   */
  build() {
    const objectCount = this.inputNodes.length;

    if (objectCount === 0) {
      return;
    }

    if (!(this.indices instanceof Uint32Array)) {
      this.indices = new Uint32Array(objectCount);
    }
    for (let i = 0; i < objectCount; i++) {
      this.indices[i] = i;
    }

    const nodeGeneratedCount = Math.max(1, 2 * objectCount - 1);
    this.outputNodes = new Array(nodeGeneratedCount);
    for (let i = 0; i < nodeGeneratedCount; i++) {
      this.outputNodes[i] = new BVHNode();
    }

    const rootNode = this.outputNodes[0];
    rootNode.leftChild[0] = 0;
    rootNode.primitiveCount[0] = objectCount;
    this.assigned++;

    this.updateBounds(0);
    this.updateDivision(0);
  }

  /**
   * @param {number} index
   */
  updateBounds(index) {
    const currentNode = this.outputNodes[index];
    const currentPrimitiveCount = currentNode.primitiveCount[0];
    const currentLeftChild = currentNode.leftChild[0];
    for (let i = 0; i < currentPrimitiveCount; i++) {
      const childNode = this.inputNodes[this.indices[currentLeftChild + i]];
      vec3.min(currentNode.minCorner, childNode.minCorner, currentNode.minCorner);
      vec3.max(currentNode.maxCorner, childNode.maxCorner, currentNode.maxCorner);
    }
  }

  /**
   * @param {number} index
   */
  updateDivision(index) {
    const currentNode = this.outputNodes[index];
    const currentPrimitiveCount = currentNode.primitiveCount[0];
    const currentLeftChild = currentNode.leftChild[0];
    if (currentPrimitiveCount < this.leafSize) {
      return;
    }

    const extent = vec3.subtract(currentNode.maxCorner, currentNode.minCorner);
    const axis = extent.indexOf(Math.max(...extent));
    const splitPosition = currentNode.minCorner[axis] + extent[axis] / 2;
    let i = currentLeftChild;
    let j = i + currentPrimitiveCount - 1;

    while (i <= j) {
      const childNode = this.inputNodes[this.indices[i]];
      const childCenter = (childNode.minCorner[axis] + childNode.maxCorner[axis]) * 0.5;
      if (childCenter < splitPosition) {
        i++;
      } else {
        [this.indices[i], this.indices[j]] = [this.indices[j], this.indices[i]];
        j--;
      }
    }

    const leftCount = i - currentLeftChild;
    if (leftCount === 0 || leftCount === currentPrimitiveCount) {
      return;
    }

    const leftChildIndex = this.assigned++;
    const rightChildIndex = this.assigned++;
    this.outputNodes[leftChildIndex].leftChild[0] = currentLeftChild;
    this.outputNodes[leftChildIndex].primitiveCount[0] = leftCount;
    this.outputNodes[rightChildIndex].leftChild[0] = i;
    this.outputNodes[rightChildIndex].primitiveCount[0] = currentPrimitiveCount - leftCount;

    currentNode.leftChild[0] = leftChildIndex;
    currentNode.primitiveCount[0] = 0;

    this.updateBounds(leftChildIndex);
    this.updateBounds(rightChildIndex);
    this.updateDivision(leftChildIndex);
    this.updateDivision(rightChildIndex);
  }
}
