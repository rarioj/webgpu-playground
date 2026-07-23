import { BaseObject } from "./BaseObject.js";
import { BaseNode } from "./BaseNode.js";
import { fastRigidInverse } from "../helper/maths.js";

import { vec3, mat4 } from "../external/wgpu-matrix.js";

/**
 * @classdesc
 */
export class BottomLevelAccelerationStructure extends BaseObject {
  /**
   * @type {BaseNode}
   */
  baseNode;

  /**
   * @type {vec3}
   */
  center;

  /**
   * @type {mat4}
   */
  inversedMatrix;

  /**
   * @param {BaseNode} node
   * @param {mat4} matrix
   * @param {Object} [options]
   */
  constructor(node, matrix, options = {}) {
    super(options);

    this.baseNode = new BaseNode();

    const corners = [
      [node.minCorner[0], node.minCorner[1], node.minCorner[2]],
      [node.minCorner[0], node.minCorner[1], node.maxCorner[2]],
      [node.minCorner[0], node.maxCorner[1], node.minCorner[2]],
      [node.minCorner[0], node.maxCorner[1], node.maxCorner[2]],
      [node.maxCorner[0], node.minCorner[1], node.minCorner[2]],
      [node.maxCorner[0], node.minCorner[1], node.maxCorner[2]],
      [node.maxCorner[0], node.maxCorner[1], node.minCorner[2]],
      [node.maxCorner[0], node.maxCorner[1], node.maxCorner[2]],
    ];

    const compare = [0, 0, 0];
    for (let i = 0; i < 8; i++) {
      vec3.transformMat4(corners[i], matrix, compare);
      vec3.min(this.baseNode.minCorner, compare, this.baseNode.minCorner);
      vec3.max(this.baseNode.maxCorner, compare, this.baseNode.maxCorner);
    }

    this.center = [
      (this.baseNode.minCorner[0] + this.baseNode.maxCorner[0]) / 2,
      (this.baseNode.minCorner[1] + this.baseNode.maxCorner[1]) / 2,
      (this.baseNode.minCorner[2] + this.baseNode.maxCorner[2]) / 2,
    ];

    this.inversedMatrix = mat4.create();
    fastRigidInverse(matrix, this.inversedMatrix);

    this.storage.main = [this.baseNode.minCorner, this.leftChild, this.baseNode.maxCorner, this.primitiveCount];
  }
}
