import { BaseObject } from "./BaseObject.js";
import { BoundingVolumeHierarchy } from "../modules/BoundingVolumeHierarchy.js";

import { vec4, mat4 } from "../external/wgpu-matrix.js";

/**
 * @typedef {Object} OBJModelCache
 * @property {[number, number, number][]} vertices
 * @property {[number, number][]} textures
 * @property {[number, number, number][]} normals
 * @property {string} code
 * @property {mat4} transform
 */

/**
 * @classdesc
 */
export class OBJModelObject extends BaseObject {
  /**
   * @type {OBJModelCache}
   */
  cache;

  /**
   * @type {number[]}
   */
  vertexData;

  /**
   * @type {function(OBJModelCache, number, number, number): void}
   */
  cacheVertexCallback;

  /**
   * @type {function(OBJModelCache, number, number): void}
   */
  cacheTextureCallback;

  /**
   * @type {function(OBJModelCache, number, number, number): void}
   */
  cacheNormalCallback;

  /**
   * @type {function(OBJModelCache, number[], string): void}
   */
  addFaceDataCallback;

  /**
   * @type {function(OBJModelObject, [[number, number, number], [number, number, number], [number, number, number]]): void}
   */
  postProcessTriangleCallback;

  /**
   * @type {BoundingVolumeHierarchy}
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
   * @param {boolean} [options.parseImmediately]
   * @param {boolean} [options.useTexture]
   * @param {boolean} [options.useNormal]
   * @param {boolean} [options.useBVH]
   */
  constructor(code, options = {}) {
    super();

    const { transform = undefined, parseImmediately = true, useTexture = true, useNormal = false, useBVH = false } = options;

    this.cache = { vertices: [], textures: [], normals: [], code, transform };
    this.vertexData = [];

    this.cacheVertexCallback = transform ? this.cacheVertexWithTransform : this.cacheVertex;
    this.cacheTextureCallback = this.doNothing;
    this.cacheNormalCallback = this.doNothing;
    this.addFaceDataCallback = this.addFaceDataVertex;
    this.postProcessTriangleCallback = this.doNothing;

    if (useTexture && useNormal) {
      this.cacheTextureCallback = this.cacheTexture;
      this.cacheNormalCallback = transform ? this.cacheNormalWithTransform : this.cacheNormal;
      this.addFaceDataCallback = this.addFaceDataVertexTextureNormal;
    } else if (useTexture) {
      this.cacheTextureCallback = this.cacheTexture;
      this.addFaceDataCallback = this.addFaceDataVertexTexture;
    } else if (useNormal) {
      this.cacheNormalCallback = transform ? this.cacheNormalWithTransform : this.cacheNormal;
      this.addFaceDataCallback = this.addFaceDataVertexNormal;
    }
    if (useBVH) {
      this.bvh = new BoundingVolumeHierarchy();
      this.inversedMatrix = mat4.create();
      this.postProcessTriangleCallback = this.postProcessTriangle;
    }

    if (parseImmediately) {
      this.parse();
      if (useBVH) {
        this.bvh.build();
      }
    }
  }

  /**
   *
   */
  parse() {
    const lines = this.cache.code.split(/\r?\n/).filter((line) => line.trim() !== "");

    for (const line of lines) {
      const tokens = line.trim().split(/\s+/);
      const type = tokens[0];
      tokens.splice(0, 1);

      switch (type) {
        case "v": // v: x y z
          this.cacheVertexCallback(this.cache, parseFloat(tokens[0]), parseFloat(tokens[1]), parseFloat(tokens[2]));
          break;
        case "vt": // vt: u v
          this.cacheTextureCallback(this.cache, parseFloat(tokens[0]), parseFloat(tokens[1]));
          break;
        case "vn": // vn: nx ny nz
          this.cacheNormalCallback(this.cache, parseFloat(tokens[0]), parseFloat(tokens[1]), parseFloat(tokens[2]));
          break;
        case "f": // f: v1/t1/n1 v2/t2/n2 v3/t3/n3 v4/t4/n4 ...
          for (let i = 0; i < tokens.length - 2; i++) {
            const vertex1 = this.addFaceDataCallback(this.cache, this.vertexData, tokens[0]);
            const vertex2 = this.addFaceDataCallback(this.cache, this.vertexData, tokens[i + 1]);
            const vertex3 = this.addFaceDataCallback(this.cache, this.vertexData, tokens[i + 2]);
            this.postProcessTriangleCallback(this, [vertex1, vertex2, vertex3]);
          }
          break;
        default:
          break;
      }
    }

    this.cache = {};
  }

  /**
   *
   */
  doNothing() {}

  /**
   * @param {OBJModelCache} cache
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  cacheVertex(cache, x, y, z) {
    cache.vertices.push([x, y, z]);
  }

  /**
   * @param {OBJModelCache} cache
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  cacheVertexWithTransform(cache, x, y, z) {
    const vertex4 = [x, y, z, 1.0];
    vec4.transformMat4(vertex4, cache.transform, vertex4);
    cache.vertices.push([vertex4[0], vertex4[1], vertex4[2]]);
  }

  /**
   * @param {OBJModelCache} cache
   * @param {number} u
   * @param {number} v
   */
  cacheTexture(cache, u, v) {
    cache.textures.push([u, v]);
  }

  /**
   * @param {OBJModelCache} cache
   * @param {number} nx
   * @param {number} ny
   * @param {number} nz
   */
  cacheNormal(cache, nx, ny, nz) {
    cache.normals.push([nx, ny, nz]);
  }

  /**
   * @param {OBJModelCache} cache
   * @param {number} nx
   * @param {number} ny
   * @param {number} nz
   */
  cacheNormalWithTransform(cache, nx, ny, nz) {
    const vertex4 = [nx, ny, nz, 0];
    vec4.transformMat4(vertex4, cache.transform, vertex4);
    cache.normals.push([vertex4[0], vertex4[1], vertex4[2]]);
  }

  /**
   * @param {OBJModelCache} cache
   * @param {nunber[]} data
   * @param {string} tokens
   * @returns {[number, number, number]}
   */
  addFaceDataVertex(cache, data, tokens) {
    const vtn = tokens.split("/"); // v//
    const vertices = cache.vertices[parseInt(vtn[0]) - 1]; // v

    // v
    data.push(vertices[0]);
    data.push(vertices[1]);
    data.push(vertices[2]);

    return vertices;
  }

  /**
   * @param {OBJModelCache} cache
   * @param {nunber[]} data
   * @param {string} tokens
   * @returns {[number, number, number]}
   */
  addFaceDataVertexTexture(cache, data, tokens) {
    const vtn = tokens.split("/"); // v/vt/
    const vertices = cache.vertices[parseInt(vtn[0]) - 1]; // v
    const textures = cache.textures[parseInt(vtn[1]) - 1]; // vt

    // v
    data.push(vertices[0]);
    data.push(vertices[1]);
    data.push(vertices[2]);
    // vt
    data.push(textures[0]);
    data.push(textures[1]);

    return vertices;
  }

  /**
   * @param {OBJModelCache} cache
   * @param {nunber[]} data
   * @param {string} tokens
   * @returns {[number, number, number]}
   */
  addFaceDataVertexNormal(cache, data, tokens) {
    const vtn = tokens.split("/"); // v//vn
    const vertices = cache.vertices[parseInt(vtn[0]) - 1]; // v
    const normals = cache.normals[parseInt(vtn[2]) - 1]; // vn

    // v
    data.push(vertices[0]);
    data.push(vertices[1]);
    data.push(vertices[2]);
    // vn
    data.push(normals[0]);
    data.push(normals[1]);
    data.push(normals[2]);

    return vertices;
  }

  /**
   * @param {OBJModelCache} cache
   * @param {nunber[]} data
   * @param {string} tokens
   * @returns {[number, number, number]}
   */
  addFaceDataVertexTextureNormal(cache, data, tokens) {
    const vtn = tokens.split("/"); // v/vt/vn
    const vertices = cache.vertices[parseInt(vtn[0]) - 1]; // v
    const textures = cache.textures[parseInt(vtn[1]) - 1]; // vt
    const normals = cache.normals[parseInt(vtn[2]) - 1]; // vn

    // v
    data.push(vertices[0]);
    data.push(vertices[1]);
    data.push(vertices[2]);
    // vt
    data.push(textures[0]);
    data.push(textures[1]);
    // vn
    data.push(normals[0]);
    data.push(normals[1]);
    data.push(normals[2]);

    return vertices;
  }

  /**
   * @param {OBJModelObject} object
   * @param {[[number, number, number], [number, number, number], [number, number, number]]} vertices
   */
  postProcessTriangle(object, vertices) {
    object.bvh.addNodeFromVertices(vertices);
  }

  /**
   * @returns {BaseObject}
   */
  updateModelMatrix() {
    super.updateModelMatrix();

    if (this.inversedMatrix) {
      mat4.invert(this.modelMatrix, this.inversedMatrix);
    }
    return this;
  }
}
