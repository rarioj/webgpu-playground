import { BaseModel } from "./BaseModel.js";
import { BaseNode } from "./BaseNode.js";
import { BoundingVolumeHierarchyStructure } from "./BoundingVolumeHierarchyStructure.js";
import { TriangularNode } from "./TriangularNode.js";

import { vec2, vec3, vec4, mat4 } from "../external/wgpu-matrix.js";

/**
 * @typedef OBJDataCache
 * @property {vec3[]} vertices
 * @property {vec2[]} textures
 * @property {vec3[]} normals
 */

/**
 * @callback FaceProcessCallback
 * @param {string[]} tokens
 * @param {OBJDataCache} cache
 */

/**
 * @callback TriangleProcessCallback
 * @param {string} token
 * @param {OBJDataCache} cache
 */

/**
 * @callback NodePostCreationCallback
 * @param {TriangularNode}
 */

/**
 * @classdesc
 */
export class OBJModel extends BaseModel {
  /**
   * @type {BaseNode}
   */
  baseNode;

  /**
   * @type {FaceProcessCallback}
   */
  faceProcessCallback;

  /**
   * @type {TriangleProcessCallback}
   */
  triangleProcessCallback;

  /**
   * @type {NodePostCreationCallback}
   */
  nodePostCreationCallback;

  /**
   * @type {BottomLevelAccelerationStructure}
   */
  bvh;

  /**
   * @type {mat4}
   */
  inversedMatrix;

  /**
   * @param {string} code
   * @param {Object} [options]
   * @param {mat4} [options.transform]
   * @param {boolean} [options.useTexture]
   * @param {boolean} [options.useNormal]
   * @param {boolean} [options.applyBVH]
   * @param {NodePostCreationCallback} [options.nodePostCreationCallback]
   */
  constructor(code, options = {}) {
    const { transform = mat4.identity(), useTexture = true, useNormal = false, applyBVH = false, nodePostCreationCallback = (node) => {} } = options;

    super(options);

    this.baseNode = new BaseNode();

    this.storage.object = [];

    this.faceProcessCallback = this.processFaces.bind(this);

    this.triangleProcessCallback = this.processTriangleVertex.bind(this);
    if (useTexture && useNormal) {
      this.triangleProcessCallback = this.processTriangleVertexTextureNormal.bind(this);
    } else if (useTexture) {
      this.triangleProcessCallback = this.processTriangleVertexTexture.bind(this);
    } else if (useNormal) {
      this.triangleProcessCallback = this.processTriangleVertexNormal.bind(this);
    }

    if (applyBVH) {
      this.faceProcessCallback = this.processFacesWithBVH.bind(this);
      this.bvh = new BoundingVolumeHierarchyStructure();
      this.inversedMatrix = mat4.create();
    }

    this.nodePostCreationCallback = nodePostCreationCallback;

    this.parse(code, transform);

    if (applyBVH) {
      this.bvh.buildBoundingVolumeHierarchy();
      this.setUpdateCallback((object) => {
        mat4.invert(object.matrix, object.inversedMatrix);
      });
    }
  }

  /**
   * @param {string} token
   * @param {OBJDataCache} cache
   * @returns {{vertex: vec3, texture: vec2, normal: vec3}}
   */
  processTriangleVertexTextureNormal(token, cache) {
    const vtn = token.split("/"); // v/vt/vn
    const vertex = cache.vertices[parseInt(vtn[0]) - 1]; // v
    const texture = cache.textures[parseInt(vtn[1]) - 1]; // vt
    const normal = cache.normals[parseInt(vtn[2]) - 1]; // vn

    // v
    this.storage.object.push(vertex[0]);
    this.storage.object.push(vertex[1]);
    this.storage.object.push(vertex[2]);
    // vt
    this.storage.object.push(texture[0]);
    this.storage.object.push(texture[1]);
    // vn
    this.storage.object.push(normal[0]);
    this.storage.object.push(normal[1]);
    this.storage.object.push(normal[2]);

    return { vertex, texture, normal };
  }

  /**
   * @param {string} token
   * @param {OBJDataCache} cache
   * @returns {{vertex: vec3, texture: vec2}}
   */
  processTriangleVertexTexture(token, cache) {
    const vt = token.split("/"); // v/vt
    const vertex = cache.vertices[parseInt(vt[0]) - 1]; // v
    const texture = cache.textures[parseInt(vt[1]) - 1]; // vt

    // v
    this.storage.object.push(vertex[0]);
    this.storage.object.push(vertex[1]);
    this.storage.object.push(vertex[2]);
    // vt
    this.storage.object.push(texture[0]);
    this.storage.object.push(texture[1]);

    return { vertex, texture };
  }

  /**
   * @param {string} token
   * @param {OBJDataCache} cache
   * @returns {{vertex: vec3, normal: vec3}}
   */
  processTriangleVertexNormal(token, cache) {
    const vtn = token.split("/"); // v//vn
    const vertex = cache.vertices[parseInt(vtn[0]) - 1]; // v
    const normal = cache.normals[parseInt(vtn[2]) - 1]; // vn

    // v
    this.storage.object.push(vertex[0]);
    this.storage.object.push(vertex[1]);
    this.storage.object.push(vertex[2]);
    // vn
    this.storage.object.push(normal[0]);
    this.storage.object.push(normal[1]);
    this.storage.object.push(normal[2]);

    return { vertex, normal };
  }

  /**
   * @param {string} token
   * @param {OBJDataCache} cache
   * @returns {{vertex: vec3}}
   */
  processTriangleVertex(token, cache) {
    const vtn = token.split("/"); // v/vt/vn
    const vertex = cache.vertices[parseInt(vtn[0]) - 1]; // v

    // v
    this.storage.object.push(vertex[0]);
    this.storage.object.push(vertex[1]);
    this.storage.object.push(vertex[2]);

    return { vertex };
  }

  /**
   * @param {string[]} tokens
   * @param {OBJDataCache} cache
   */
  processFaces(tokens, cache) {
    for (let i = 0; i < tokens.length - 2; i++) {
      this.triangleProcessCallback(tokens[0], cache);
      this.triangleProcessCallback(tokens[1 + i], cache);
      this.triangleProcessCallback(tokens[2 + i], cache);
    }
  }

  /**
   * @param {string[]} tokens
   * @param {OBJDataCache} cache
   */
  processFacesWithBVH(tokens, cache) {
    for (let i = 0; i < tokens.length - 2; i++) {
      const { vertex: v1, texture: vt1, normal: vn1 } = this.triangleProcessCallback(tokens[0], cache);
      const { vertex: v2, texture: vt2, normal: vn2 } = this.triangleProcessCallback(tokens[1 + i], cache);
      const { vertex: v3, texture: vt3, normal: vn3 } = this.triangleProcessCallback(tokens[2 + i], cache);

      const node = new TriangularNode({
        // minCorner: this.baseNode.minCorner,
        // maxCorner: this.baseNode.maxCorner,
        center: [(v1[0] + v2[0] + v3[0]) / 3, (v1[1] + v2[1] + v3[1]) / 3, (v1[2] + v2[2] + v3[2]) / 3],
        vertices: [v1, v2, v3],
        textures: [vt1, vt2, vt3],
        normals: [vn1, vn2, vn3],
      });

      this.nodePostCreationCallback(node);
      this.bvh.addObject(node);
    }
  }

  /**
   * @param {string} code
   * @param {mat4} matrix
   */
  parse(code, matrix) {
    const lines = code.split(/\r?\n/).filter((line) => line.trim() !== "");
    const cache = {
      vertices: [],
      textures: [],
      normals: [],
    };

    for (const line of lines) {
      const tokens = line.trim().split(/\s+/);
      const type = tokens[0];
      tokens.splice(0, 1);

      switch (type) {
        case "v": // v: x y z
          const vertex4 = [parseFloat(tokens[0]), parseFloat(tokens[1]), parseFloat(tokens[2]), 1.0];
          vec4.transformMat4(vertex4, matrix, vertex4);

          const vertex3 = [vertex4[0], vertex4[1], vertex4[2]];
          vec3.min(this.baseNode.minCorner, vertex3, this.baseNode.minCorner);
          vec3.max(this.baseNode.maxCorner, vertex3, this.baseNode.maxCorner);
          cache.vertices.push(vertex3);
          break;
        case "vt": // vt: u v
          const texture = [parseFloat(tokens[0]), parseFloat(tokens[1])];
          cache.textures.push([texture[0], texture[1]]);
          break;
        case "vn": // vn: nx ny nz
          const normal = [parseFloat(tokens[0]), parseFloat(tokens[1]), parseFloat(tokens[2]), 0.0];
          vec4.transformMat4(normal, matrix, normal);
          cache.normals.push([normal[0], normal[1], normal[2]]);
          break;
        case "f": // f: v1 v2 v3 v4 ...
          this.faceProcessCallback(tokens, cache);
          break;
        default:
      }
    }
  }
}
