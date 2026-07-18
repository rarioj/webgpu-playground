import { NodeObject } from "../components/NodeObject.js";

import { vec3 } from "../external/wgpu-matrix.js";

/**
 * @file
 */

/**
 * @param {vec3} center
 * @param {number} radius
 * @param {vec3} color
 * @returns {NodeObject}
 */
export function createSphericalNode(center, radius, color = [1.0, 1.0, 1.0]) {
  const node = new NodeObject();
  node.center = center;
  node.radius = radius;
  node.color = color;

  const axis = [radius, radius, radius];
  const temp = [0, 0, 0];

  vec3.subtract(center, axis, temp);
  vec3.min(node.minCorner, temp, node.minCorner);
  vec3.add(center, axis, temp);
  vec3.max(node.maxCorner, temp, node.maxCorner);

  return node;
}
