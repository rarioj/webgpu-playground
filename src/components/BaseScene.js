import { BaseObject } from "./BaseObject.js";

/**
 * @classdesc
 */
export class BaseScene extends BaseObject {
  /**
   * @type {BaseObject[]}
   */
  objects;

  /**
   * @type {Object.<string, number>}
   */
  typeCount;

  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    super(options);

    this.objects = [];
    this.typeCount = {};
  }

  /**
   * @param {BaseObject} object
   * @param {string} [type]
   */
  addObject(object, type = "__default__") {
    this.objects.push(object);
    if (!this.typeCount[type]) {
      this.typeCount[type] = 0;
    }
    this.typeCount[type]++;
    if (object?.storage?.main) {
      for (let i = 0; i < object.storage.main.length; i++) {
        this.storage.main.push(object.storage.main[i]);
      }
    }
  }

  /**
   * @param {string} [type]
   * @returns {number}
   */
  getTypeCount(type = "__default__") {
    return this.typeCount[type] ? this.typeCount[type] : 0;
  }

  /**
   *
   */
  update() {
    super.update();
    for (let i = 0; i < this.objects.length; i++) {
      this.objects[i].update();
    }
  }
}
