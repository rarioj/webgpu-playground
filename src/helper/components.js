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

/**
 * @param {vec3} center
 * @param {[vec3, vec3, vec3]} offsets
 * @param {vec3} color
 * @returns {NodeObject}
 */
export function createTriangularNode(center, offsets, color = [1.0, 1.0, 1.0]) {
  const node = new NodeObject();
  node.center = [0, 0, 0];
  node.corners = [];
  node.color = color;

  const weight = [0.33333, 0.33333, 0.33333];

  offsets.forEach((offset) => {
    const corner = [center[0], center[1], center[2]];
    node.corners.push([corner[0] + offset[0], corner[1] + offset[1], corner[2] + offset[2]]);

    const tempCenter = [corner[0], corner[1], corner[2]];
    vec3.multiply(tempCenter, weight, tempCenter);
    vec3.add(node.center, tempCenter, node.center);
  });

  node.corners.forEach((corner) => {
    vec3.min(node.minCorner, corner, node.minCorner);
    vec3.max(node.maxCorner, corner, node.maxCorner);
  });

  return node;
}
