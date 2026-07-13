import { mat4, vec3, vec4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

/**
 * @file
 */

/**
 * @param {string} code
 * @param {Object} [options]
 * @param {number} [options.scale]
 * @param {vec3} [options.translate]
 * @param {boolean} [options.useVertex]
 * @param {boolean} [options.useTexture]
 * @param {boolean} [options.useNormal]
 * @returns {number[]}
 */
export function parseOBJCode(code, options = {}) {
  const { scale = false, translate = undefined, useVertex = true, useTexture = true, useNormal = false } = options;

  const v = [];
  const vt = [];
  const vn = [];
  const data = [];
  const lines = code.split(/\r?\n/).filter((line) => line.trim() !== "");

  const matrix = mat4.identity();
  if (translate) {
    mat4.multiply(matrix, mat4.translation(translate), matrix);
  }
  if (scale) {
    mat4.multiply(matrix, mat4.scaling([scale, scale, scale]), matrix);
  }

  /**
   * @param {string} token
   */
  const processTriangle = (token) => {
    const vtn = token.split("/");
    let vTarget = [];
    let vtTarget = [];
    let vnTarget = [];

    if (useVertex) {
      vTarget = v[parseInt(vtn[0]) - 1]; // v
      data.push(vTarget[0]); // x
      data.push(vTarget[1]); // y
      data.push(vTarget[2]); // z
    }

    if (useTexture) {
      vtTarget = vt[parseInt(vtn[1]) - 1]; // vt
      data.push(vtTarget[0]); // u
      data.push(vtTarget[1]); // v
    }

    if (useNormal) {
      vnTarget = vn[parseInt(vtn[2]) - 1]; // vn
      data.push(vnTarget[0]); // x
      data.push(vnTarget[1]); // y
      data.push(vnTarget[2]); // z
    }
  };

  for (const line of lines) {
    const tokens = line.trim().split(/\s+/);
    const type = tokens[0];
    tokens.splice(0, 1);

    switch (type) {
      case "v":
        const vertex = [parseFloat(tokens[0]), parseFloat(tokens[1]), parseFloat(tokens[2]), 1.0];
        vec4.transformMat4(vertex, matrix, vertex);
        // v: x y z
        v.push([vertex[0], vertex[1], vertex[2]]);
        break;
      case "vt":
        const texture = [parseFloat(tokens[0]), parseFloat(tokens[1])];
        // vt: u v
        vt.push([texture[0], texture[1]]);
        break;
      case "vn":
        const normal = [parseFloat(tokens[0]), parseFloat(tokens[1]), parseFloat(tokens[2]), 0.0];
        vec4.transformMat4(normal, matrix, normal);
        // vn: nx ny nz
        vn.push([normal[0], normal[1], normal[2]]);
        break;
      case "f":
        // f: v1 v2 v3 v4 ...
        for (let i = 0; i < tokens.length - 2; i++) {
          processTriangle(tokens[0]);
          processTriangle(tokens[1 + i]);
          processTriangle(tokens[2 + i]);
        }
        break;
      default:
    }
  }

  return data;
}
