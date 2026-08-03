import { BaseObject } from "../objects/BaseObject.js";

/**
 * @classdesc
 */
export class Scene {
  /**
   * @type {Array.<function(number, number): void>}
   */
  events;

  /**
   * @type {Object.<string, number>}
   */
  typeCount;

  /**
   * @type {number}
   */
  startTime;

  /**
   * @type {number}
   */
  currentTime;

  /**
   * @type {[number]}
   */
  elapsed;

  /**
   * @type {[number]}
   */
  delta;

  /**
   *
   */
  constructor() {
    this.events = [];
    this.typeCount = {};
    const now = performance.now();
    this.startTime = now;
    this.currentTime = now;
    this.elapsed = [0];
    this.delta = [0];
  }

  /**
   * @param {BaseObject} object
   * @param {string} type
   * @returns {BaseScene}
   */
  addObject(object, type = "__default__") {
    this.events.push(() => object.update());
    if (this.typeCount[type]) {
      this.typeCount[type]++;
    } else {
      this.typeCount[type] = 1;
    }
    return this;
  }

  /**
   * @param {function(number, number): void} callback
   * @returns {BaseScene}
   */
  addEvent(callback) {
    this.events.push(callback);
    return this;
  }

  /**
   *
   */
  play() {
    const now = performance.now();
    this.delta[0] = now - this.currentTime;
    this.currentTime = now;
    this.elapsed[0] = (this.currentTime - this.startTime) / 1000;
    for (let i = 0; i < this.events.length; i++) {
      this.events[i](this.elapsed[0], this.delta[0]);
    }
  }
}
