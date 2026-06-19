import { BasicModel } from "./library/component/BasicModel.js";
import { mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";
import { convertDegreeToRadian } from "./library/helper/utility.js";

export class Scene {
  /**
   * @type {BasicModel[]}
   */
  models = [];

  /**
   *
   */
  constructor() {
    const model = new BasicModel((obj) => {
      obj.eulers[2] -= 1;
      obj.eulers[2] %= 360;
      mat4.rotateZ(obj.model, convertDegreeToRadian(obj.eulers[2]), obj.model);
    });
    model.position = [2, 0, 0];
    this.models.push(model);
  }

  /**
   *
   */
  update() {
    this.models.forEach((model) => {
      model.update();
    });
  }
}
