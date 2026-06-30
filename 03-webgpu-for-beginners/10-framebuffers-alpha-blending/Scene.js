import { BasicModel } from "./library/component/BasicModel.js";
import { mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";
import { convertDegreeToRadian } from "./library/helper/utility.js";

/**
 * @classdesc
 */
export class Scene {
  /**
   * @type {Float32Array}
   */
  objectData;

  /**
   * @type {BasicModel[]}
   */
  triangles = [];

  /**
   * @type {BasicModel[]}
   */
  tiles = [];

  /**
   * @type {BasicModel}
   */
  statue;

  /**
   *
   */
  constructor() {
    this.objectData = new Float32Array(4 * 4 * 1024);

    this.initTriangles();
    this.initTiles();
    this.initStatue();
  }

  /**
   *
   */
  initTriangles() {
    let i = 0;
    for (let y = -5; y < 5; y++) {
      const model = new BasicModel();
      model.setPosition(2, y, 0.5);
      model.setUpdateCallback((obj) => {
        obj.eulers[2] -= 1;
        obj.eulers[2] %= 360;
        obj.matrix = mat4.rotateZ(obj.matrix, convertDegreeToRadian(obj.eulers[2]));
      });
      this.triangles.push(model);

      const matrix = mat4.create();
      for (let j = 0; j < 16; j++) {
        this.objectData[16 * i + j] = matrix[j];
      }
      i++;
    }
  }

  /**
   *
   */
  initTiles() {
    let i = this.triangles.length;
    for (let x = -8; x < 8; x++) {
      for (let y = -8; y < 8; y++) {
        const model = new BasicModel();
        model.setPosition(x, y, 0);
        this.tiles.push(model);

        const matrix = mat4.create();
        for (let j = 0; j < 16; j++) {
          this.objectData[16 * i + j] = matrix[j];
        }
        i++;
      }
    }
  }

  /**
   *
   */
  initStatue() {
    this.statue = new BasicModel();
    this.statue.setPosition(0, 0, 0);
    this.statue.setUpdateCallback((obj) => {
      obj.eulers[2] -= 1;
      obj.eulers[2] %= 360;
      obj.matrix = mat4.rotateZ(obj.matrix, convertDegreeToRadian(obj.eulers[2]));
    });
  }

  /**
   *
   */
  update() {
    let i = 0;
    this.triangles.forEach((model) => {
      model.update();
      for (let j = 0; j < 16; j++) {
        this.objectData[16 * i + j] = model.matrix[j];
      }
      i++;
    });
    this.tiles.forEach((model) => {
      model.update();
      for (let j = 0; j < 16; j++) {
        this.objectData[16 * i + j] = model.matrix[j];
      }
      i++;
    });
    this.statue.update();
    for (let j = 0; j < 16; j++) {
      this.objectData[16 * i + j] = this.statue.matrix[j];
    }
    i++;
  }
}
