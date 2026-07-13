import { BaseCamera } from "./BaseCamera.js";
import { BaseModel } from "./BaseModel.js";

/**
 * @classdesc
 */
export class SceneBuilder {
  /**
   * @type {Float32Array}
   */
  data;

  /**
   * @type {BaseCamera}
   */
  camera;

  /**
   * @type {BaseModel[]}
   */
  models;

  /**
   * @type {Object.<string, number>}
   */
  typeCount;

  /**
   * @param {BaseCamera} camera
   */
  constructor(camera) {
    this.camera = camera;
    this.models = [];
    this.typeCount = {};
  }

  /**
   * @param {BaseCamera} camera
   */
  setCamera(camera) {
    this.camera = camera;
  }

  /**
   * @param {BaseModel} model
   * @param {string} [type]
   */
  addModel(model, type = "__default__") {
    this.models.push(model);
    if (!this.typeCount[type]) {
      this.typeCount[type] = 0;
    }
    this.typeCount[type]++;
  }

  /**
   *
   */
  build() {
    this.data = new Float32Array(16 * this.models.length); // 4x4 matrix * number of models
    this.update();
  }

  /**
   *
   */
  update() {
    this.camera.update();
    for (let i = 0; i < this.models.length; i++) {
      this.models[i].update();
      for (let j = 0; j < 16; j++) {
        this.data[16 * i + j] = this.models[i].matrix[j];
      }
    }
  }
}
