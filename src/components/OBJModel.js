import { BaseModel } from "./BaseModel.js";
import { NodeObject } from "./NodeObject.js";
import { BoundingVolumeHierarchyScene } from "./BoundingVolumeHierarchyScene.js";

import { vec2, vec3, vec4, mat4 } from "../external/wgpu-matrix.js";

/**
 * @callback TriangleProcessCallback
 * @param {vec3} vertex
 * @param {vec2} texture
 * @param {vec3} normal
 */

/**
 * @callback FaceProcessCallback
 * @param {string[]} tokens
 * @param {vec3[]} vertices
 * @param {vec2[]} textures
 * @param {vec3[]} normals
 */

/**
 * @classdesc
 */
export class OBJModel extends BaseModel {
  /**
   * @type {vec3}
   */
  minCorner;

  /**
   * @type {vec3}
   */
  maxCorner;

  /**
   * @type {TriangleProcessCallback[]}
   */
  triangleProcessCallbacks;

  /**
   * @type {FaceProcessCallback}
   */
  faceProcessCallback;

  /**
   * @type {BoundingVolumeHierarchyScene}
   */
  bvh;

  /**
   * @type {mat4}
   */
  invertedMatrix;

  /**
   * @param {string} code
   * @param {Object} [options]
   * @param {mat4} [options.transform]
   * @param {boolean} [options.useVertex]
   * @param {boolean} [options.useTexture]
   * @param {boolean} [options.useNormal]
   * @param {boolean} [options.applyBVH]
   */
  constructor(code, options = {}) {
    const { transform = mat4.identity(), useVertex = true, useTexture = true, useNormal = false, applyBVH = false } = options;

    super(options);

    this.storage.object = [];
    this.minCorner = [Infinity, Infinity, Infinity];
    this.maxCorner = [-Infinity, -Infinity, -Infinity];
    this.triangleProcessCallbacks = [];
    this.faceProcessCallback = this.processFacesArray.bind(this);

    if (useVertex) {
      this.triangleProcessCallbacks.push(this.addGeometricVertices.bind(this));
    }
    if (useTexture) {
      this.triangleProcessCallbacks.push(this.addTextureCoordinates.bind(this));
    }
    if (useNormal) {
      this.triangleProcessCallbacks.push(this.addVertexNormals.bind(this));
    }
    if (applyBVH) {
      this.faceProcessCallback = this.processFacesNode.bind(this);
      this.bvh = new BoundingVolumeHierarchyScene();
      this.invertedMatrix = mat4.identity();
    }

    this.parse(code, transform);

    if (applyBVH) {
      this.bvh.buildBoundingVolumeHierarchy();
      mat4.invert(this.matrix, this.invertedMatrix);
    }
  }

  /**
   * @param {vec3} vertex
   * @param {vec2} texture
   * @param {vec3} normal
   */
  addGeometricVertices(vertex, texture, normal) {
    this.storage.object.push(vertex[0]);
    this.storage.object.push(vertex[1]);
    this.storage.object.push(vertex[2]);
  }

  /**
   * @param {vec3} vertex
   * @param {vec2} texture
   * @param {vec3} normal
   */
  addTextureCoordinates(vertex, texture, normal) {
    this.storage.object.push(texture[0]);
    this.storage.object.push(texture[1]);
  }

  /**
   * @param {vec3} vertex
   * @param {vec2} texture
   * @param {vec3} normal
   */
  addVertexNormals(vertex, texture, normal) {
    this.storage.object.push(normal[0]);
    this.storage.object.push(normal[1]);
    this.storage.object.push(normal[2]);
  }

  /**
   * @param {string} token
   * @param {vec3[]} vertices
   * @param {vec2[]} textures
   * @param {vec3[]} normals
   * @returns {{vertex: vec3, texture: vec2, normal: vec3}}
   */
  processTriangle(token, vertices, textures, normals) {
    // TODO: handles v/vt and v//vn
    const vtn = token.split("/");
    const vertex = vertices[parseInt(vtn[0]) - 1]; // v
    const texture = textures[parseInt(vtn[1]) - 1]; // vt
    const normal = normals[parseInt(vtn[2]) - 1]; // vn

    for (let i = 0; i < this.triangleProcessCallbacks.length; i++) {
      this.triangleProcessCallbacks[i](vertex, texture, normal);
    }

    return { vertex, texture, normal };
  }

  /**
   * @param {string[]} tokens
   * @param {vec3[]} vertices
   * @param {vec2[]} textures
   * @param {vec3[]} normals
   */
  processFacesArray(tokens, vertices, textures, normals) {
    for (let i = 0; i < tokens.length - 2; i++) {
      this.processTriangle(tokens[0], vertices, textures, normals);
      this.processTriangle(tokens[1 + i], vertices, textures, normals);
      this.processTriangle(tokens[2 + i], vertices, textures, normals);
    }
  }

  /**
   * @param {string[]} tokens
   * @param {vec3[]} vertices
   * @param {vec2[]} textures
   * @param {vec3[]} normals
   */
  processFacesNode(tokens, vertices, textures, normals) {
    for (let i = 0; i < tokens.length - 2; i++) {
      const { vertex: v1, texture: vt1, normal: vn1 } = this.processTriangle(tokens[0], vertices, textures, normals);
      const { vertex: v2, texture: vt2, normal: vn2 } = this.processTriangle(tokens[1 + i], vertices, textures, normals);
      const { vertex: v3, texture: vt3, normal: vn3 } = this.processTriangle(tokens[2 + i], vertices, textures, normals);
      const node = new NodeObject();
      node.center = [(v1[0] + v2[0] + v3[0]) / 3, (v1[1] + v2[1] + v3[1]) / 3, (v1[2] + v2[2] + v3[2]) / 3];
      node.corners = [v1, v2, v3];
      node.textures = [vt1, vt2, vt3];
      node.normals = [vn1, vn2, vn3];
      for (let j = 0; j < node.corners.length; j++) {
        vec3.min(node.minCorner, node.corners[j], node.minCorner);
        vec3.max(node.maxCorner, node.corners[j], node.maxCorner);
        vec3.min(this.minCorner, node.corners[j], this.minCorner);
        vec3.max(this.maxCorner, node.corners[j], this.maxCorner);
      }
      // TODO: bespoke structure
      node.storage.main = [
        node.corners[0],
        0,
        node.normals[0],
        0,
        node.corners[1],
        0,
        node.normals[1],
        0,
        node.corners[2],
        0,
        node.normals[2],
        0,
        1.0,
        1.0,
        1.0, // TODO: hardcoded colour
        0,
      ];
      this.bvh.addObject(node);
    }
  }

  /**
   * @param {string} code
   * @param {mat4} matrix
   */
  parse(code, matrix) {
    const lines = code.split(/\r?\n/).filter((line) => line.trim() !== "");
    const vertices = [];
    const textures = [];
    const normals = [];

    for (const line of lines) {
      const tokens = line.trim().split(/\s+/);
      const type = tokens[0];
      tokens.splice(0, 1);

      switch (type) {
        case "v": // v: x y z
          const vertex = [parseFloat(tokens[0]), parseFloat(tokens[1]), parseFloat(tokens[2]), 1.0];
          vec4.transformMat4(vertex, matrix, vertex);
          vertices.push([vertex[0], vertex[1], vertex[2]]);
          break;
        case "vt": // vt: u v
          const texture = [parseFloat(tokens[0]), parseFloat(tokens[1])];
          textures.push([texture[0], texture[1]]);
          break;
        case "vn": // vn: nx ny nz
          const normal = [parseFloat(tokens[0]), parseFloat(tokens[1]), parseFloat(tokens[2]), 0.0];
          vec4.transformMat4(normal, matrix, normal);
          normals.push([normal[0], normal[1], normal[2]]);
          break;
        case "f": // f: v1 v2 v3 v4 ...
          this.faceProcessCallback(tokens, vertices, textures, normals);
          break;
        default:
      }
    }
  }

  /**
   *
   */
  update() {
    super.update();
    mat4.invert(this.matrix, this.invertedMatrix);
  }
}
