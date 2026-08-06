import { vec3, mat4 } from "../external/wgpu-matrix.js";

/**
 * @file
 */

/**
 * @param {[number, number, number]} center
 * @param {number} radius
 * @returns {[number, number, number], [number, number, number]}
 */
export function getSphereCorners(center, radius) {
  const axis = [radius, radius, radius];
  const temp = [0, 0, 0];
  const minCorner = [Infinity, Infinity, Infinity];
  const maxCorner = [-Infinity, -Infinity, -Infinity];

  vec3.subtract(center, axis, temp);
  vec3.min(minCorner, temp, minCorner);
  vec3.add(center, axis, temp);
  vec3.max(maxCorner, temp, maxCorner);

  return [minCorner, maxCorner];
}

/**
 * @param {[number, number, number]} center
 * @param {[[number, number, number], [number, number, number], [number, number, number]]} offsets
 * @returns {[number, number, number], [number, number, number], [number, number, number]}}
 */
export function getTriangleVertices(center, offsets) {
  const weight = [0.333333, 0.333333, 0.333333];
  const position = vec3.create();
  const vertices = [];

  for (let i = 0; i < offsets.length; i++) {
    const corner = [center[0], center[1], center[2]];
    vertices.push([corner[0] + offsets[i][0], corner[1] + offsets[i][1], corner[2] + offsets[i][2]]);

    const temp = [corner[0], corner[1], corner[2]];
    vec3.multiply(temp, weight, temp);
    vec3.add(position, temp, position);
  }

  return vertices;
}

/**
 * @param {mat4} model
 * @param {mat4} view
 * @returns {mat4}
 */
export function getModelViewMatrix(model, view) {
  const mv = mat4.create();
  mat4.multiply(view, model, mv);
  return mv;
}

/**
 * @param {mat4} view
 * @param {mat4} projection
 * @returns {mat4}
 */
export function getViewProjectionMatrix(view, projection) {
  const vp = mat4.create();
  mat4.multiply(projection, view, vp);
  return vp;
}

/**
 * @param {mat4} model
 * @param {mat4} view
 * @param {mat4} projection
 * @returns {mat4}
 */
export function getModelViewProjectionMatrix(model, view, projection) {
  const mvp = mat4.create();
  mat4.multiply(projection, view, mvp);
  mat4.multiply(mvp, model, mvp);
  return mvp;
}
