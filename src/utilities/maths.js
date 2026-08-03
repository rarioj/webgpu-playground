import { vec3, mat4 } from "../external/wgpu-matrix.js";

/**
 * @file
 */

/**
 * @param {number} [min]
 * @param {number} [max]
 * @param {boolean} [integer]
 * @returns {number}
 */
export function getRandom(min = 0.0, max = 1.0, integer = false) {
  if (integer) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  return Math.random() * (max - min) + min;
}

/**
 * @param {number} degree
 * @returns {number}
 */
export function degreeToRadian(degree) {
  return degree * (Math.PI / 180);
}

/**
 * @param {number} radian
 * @returns {number}
 */
export function radianToDegree(radian) {
  return radian * (180 / Math.PI);
}

/**
 * @param {number} value
 * @param {number} [decimalPlace]
 * @param {boolean} [fixed]
 * @returns {number}
 */
export function roundToDecimal(value, decimalPlace = 2, fixed = false) {
  if (fixed) {
    return +value.toFixed(decimalPlace);
  }
  const multiplier = Math.pow(10, decimalPlace);
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

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
 * @param {mat4} projection
 * @returns {mat4}
 */
export function getModelViewProjectionMatrix(model, view, projection) {
  const mvp = mat4.create();
  mat4.multiply(projection, view, mvp);
  mat4.multiply(mvp, model, mvp);
  return mvp;
}
