import { BaseScene } from "./BaseScene.js";
import { NodeObject } from "./NodeObject.js";

import { vec3 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
export class BoundingVolumeHierarchyScene extends BaseScene {
  /**
   * @type {NodeObject[]}
   */
  nodes;

  /**
   * @type {Uint32Array}
   */
  indices;

  /**
   * @type {number}
   */
  assigned;

  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    super(options);

    this.storage.nodes = [];
    this.assigned = 0;
  }

  /**
   *
   */
  buildBoundingVolumeHierarchy() {
    const objectCount = this.objects.length;
    this.indices = new Uint32Array(objectCount);
    for (let i = 0; i < objectCount; i++) {
      this.indices[i] = i;
    }

    const nodeGeneratedCount = 2 * objectCount - 1;
    this.nodes = new Array(nodeGeneratedCount);
    for (let i = 0; i < nodeGeneratedCount; i++) {
      this.nodes[i] = new NodeObject();
      for (let j = 0; j < this.nodes[i].storage.main.length; j++) {
        this.storage.nodes.push(this.nodes[i].storage.main[j]);
      }
    }

    const rootNode = this.nodes[0];
    rootNode.setLeftChild(0);
    rootNode.setPrimitiveCount(objectCount);
    this.assigned++;

    this.updateBounds(0);
    this.updateDivision(0);
  }

  /**
   * @param {number} index
   */
  updateBounds(index) {
    const currentNode = this.nodes[index];
    const currentPrimitiveCount = currentNode.getPrimitiveCount();
    const currentLeftChild = currentNode.getLeftChild();
    for (let i = 0; i < currentPrimitiveCount; i++) {
      const childNode = this.objects[this.indices[currentLeftChild + i]];
      vec3.min(currentNode.minCorner, childNode.minCorner, currentNode.minCorner);
      vec3.max(currentNode.maxCorner, childNode.maxCorner, currentNode.maxCorner);
    }
  }

  /**
   * @param {number} index
   */
  updateDivision(index) {
    const currentNode = this.nodes[index];
    const currentPrimitiveCount = currentNode.getPrimitiveCount();
    const currentLeftChild = currentNode.getLeftChild();
    if (currentPrimitiveCount < 2) {
      return;
    }

    const extent = vec3.subtract(currentNode.maxCorner, currentNode.minCorner);
    const axis = extent.indexOf(Math.max(...extent));
    const splitPosition = currentNode.minCorner[axis] + extent[axis] / 2;
    let i = currentLeftChild;
    let j = i + currentPrimitiveCount - 1;

    while (i <= j) {
      const childNode = this.objects[this.indices[i]];
      if ((childNode.minCorner[axis] + childNode.maxCorner[axis]) / 2 < splitPosition) {
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
    this.nodes[leftChildIndex].setLeftChild(currentLeftChild);
    this.nodes[leftChildIndex].setPrimitiveCount(leftCount);
    this.nodes[rightChildIndex].setLeftChild(i);
    this.nodes[rightChildIndex].setPrimitiveCount(currentPrimitiveCount - leftCount);

    currentNode.setLeftChild(leftChildIndex);
    currentNode.setPrimitiveCount(0);

    this.updateBounds(leftChildIndex);
    this.updateBounds(rightChildIndex);
    this.updateDivision(leftChildIndex);
    this.updateDivision(rightChildIndex);
  }
}
