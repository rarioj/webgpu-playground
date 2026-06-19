import { BasicModel } from "./library/component/BasicModel.js";
import { mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";
import { convertDegreeToRadian } from "./library/helper/utility.js";

export class Scene {
  /**
   * @type {Float32Array}
   */
  objectData;

  /**
   * @type {BasicModel[]}
   */
  triangleModels = [];

  /**
   * @type {BasicModel[]}
   */
  tileModels = [];

  /**
   *
   */
  constructor() {
    this.objectData = new Float32Array(16 * 1024);

    this.initTriangleModels();
    this.initTileModels();
  }

  /**
   *
   */
  initTriangleModels() {
    let i = 0;
    for (let y = -5; y < 5; y++) {
      const model = new BasicModel((obj) => {
        obj.eulers[2] -= 1;
        obj.eulers[2] %= 360;
        mat4.rotateZ(obj.model, convertDegreeToRadian(obj.eulers[2]), obj.model);
      });
      model.position = [2, y, 0.5];
      this.triangleModels.push(model);

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
  initTileModels() {
    let i = this.triangleModels.length;
    for (let x = -8; x < 8; x++) {
      for (let y = -8; y < 8; y++) {
        const model = new BasicModel();
        model.position = [x, y, 0];
        this.tileModels.push(model);

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
  update() {
    let i = 0;
    this.triangleModels.forEach((model) => {
      model.update();
      for (let j = 0; j < 16; j++) {
        this.objectData[16 * i + j] = model.model[j];
      }
      i++;
    });
    this.tileModels.forEach((model) => {
      model.update();
      for (let j = 0; j < 16; j++) {
        this.objectData[16 * i + j] = model.model[j];
      }
      i++;
    });
  }
}
