import { mat4, vec3, vec4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

/**
 * @param {string} key
 * @param {any} [fallback]
 * @returns {any}
 */
export function getQueryValue(key, fallback = null) {
  if (!(getQueryValue.parameters instanceof URLSearchParams)) {
    getQueryValue.parameters = new URLSearchParams(location.search);
  }
  return getQueryValue.parameters.has(key) ? getQueryValue.parameters.get(key) : fallback;
}

/**
 * @param {number} [min]
 * @param {number} [max]
 * @param {boolean} [int]
 * @returns {number}
 */
export function getRandomBetween(min = 0.0, max = 1.0, int = false) {
  if (int) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  return Math.random() * (max - min) + min;
}

/**
 * @param {number} degree
 * @returns {number}
 */
export function convertDegreeToRadian(degree) {
  return degree * (Math.PI / 180);
}

/**
 * @param {number} radian
 * @returns {number}
 */
export function convertRadianToDegree(radian) {
  return radian * (180 / Math.PI);
}

/**
 * @param {number} value
 * @param {number} [decimalPlace]
 * @returns {number}
 */
export function roundToDecimalPlace(value, decimalPlace = 2) {
  const multiplier = Math.pow(10, decimalPlace);
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

/**
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {(wrapper: HTMLElement, span: HTMLSpanElement, progress: HTMLProgressElement)}
 */
export function createProgressBar(options = {}) {
  const {
    container = document.body,
    style = {
      position: "fixed",
      top: "0",
      width: "100%",
    },
  } = options;

  const wrapper = document.createElement("article");
  const caption = document.createElement("span");
  const progress = document.createElement("progress");
  progress.max = 100;

  wrapper.appendChild(caption);
  wrapper.appendChild(progress);
  Object.assign(wrapper.style, style);

  if (container instanceof HTMLElement) {
    container.appendChild(wrapper);
  }

  return { wrapper, caption, progress };
}

/**
 * @param {Object} [options]
 * @param {HTMLElement} [options.parentContainer]
 * @param {CSSStyleDeclaration} [options.parentStyle]
 * @param {string} [options.label]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {{outer: HTMLSpanElement, inner: HTMLElement}}
 */
export function createDebugElement(options = {}) {
  const {
    parentContainer = document.body,
    parentStyle = {
      display: "flex",
      position: "fixed",
      right: "0",
      top: "0",
    },
    label = "Debug:",
    style = {
      margin: "0 0.5em",
      fontSize: "smaller",
    },
  } = options;

  if (!(createDebugElement.container instanceof HTMLElement)) {
    createDebugElement.container = document.createElement("section");
    Object.assign(createDebugElement.container.style, parentStyle);
    if (parentContainer instanceof HTMLElement) {
      parentContainer.appendChild(createDebugElement.container);
    }
  }

  const outer = document.createElement("span");
  outer.innerText = label + " ";
  const inner = document.createElement("small");
  outer.appendChild(inner);

  Object.assign(outer.style, style);
  createDebugElement.container.appendChild(outer);

  return { outer, inner };
}

/**
 * @async
 * @param {{name: string, url: string, type: string, group: boolean}[]} resources
 * @returns {Object.<string, String|Blob|{group: string, data: String|Blob}>}
 */
export async function loadResources(resources) {
  let fetched = 0;

  const { wrapper, caption, progress } = createProgressBar();
  const results = {};

  for (const resource of resources) {
    const downloaded = await fetch(resource.url)
      .then((response) => {
        caption.ariaBusy = true;
        caption.innerText = resource.url.split("/").pop();
        if (!response.ok) {
          throw `Unable to fetch resource URL: ${resource.url}`;
        }
        return response[resource.type]();
      })
      .then((data) => {
        fetched++;
        progress.value = (fetched / resources.length) * 100;
        return data;
      });

    if (resource.group) {
      if (!Array.isArray(results[resource.name])) {
        results[resource.name] = [];
      }
      if (typeof resource.group === "string") {
        results[resource.name].push({
          group: resource.group,
          data: downloaded,
        });
      } else {
        results[resource.name].push(downloaded);
      }
    } else {
      results[resource.name] = downloaded;
    }
  }

  progress.value = 100;
  caption.ariaBusy = false;
  caption.innerText = "";
  setTimeout(() => {
    wrapper.remove();
  }, 100);
  return results;
}

/**
 * @param {string} text
 * @param {Object} [options]
 * @param {boolean} [options.useVertex]
 * @param {boolean} [options.useTexture]
 * @param {boolean} [options.useNormal]
 * @param {mat4} [options.preTransform]
 * @returns {Float32Array}
 */
export function parseObjCode(text, options = {}) {
  const {
    useVertex = true,
    useTexture = true,
    useNormal = false, // compatible with older learning material
    preTransform = null,
  } = options;

  const v = [];
  const vt = [];
  const vn = [];
  const vertices = [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  /**
   * @param {string} data "a/b/c"
   */
  const triangle = (data) => {
    const vtn = data.split("/");

    if (useVertex) {
      const vTarget = v[parseInt(vtn[0]) - 1];
      vertices.push(vTarget[0]); // x
      vertices.push(vTarget[1]); // y
      vertices.push(vTarget[2]); // z
    }

    if (useTexture) {
      const vtTarget = vt[parseInt(vtn[1]) - 1];
      vertices.push(vtTarget[0]); // u
      vertices.push(vtTarget[1]); // v
    }

    if (useNormal) {
      const vnTarget = vn[parseInt(vtn[2]) - 1];
      vertices.push(vnTarget[0]); // x
      vertices.push(vnTarget[1]); // y
      vertices.push(vnTarget[2]); // z
    }
  };

  for (const line of lines) {
    const words = line.trim().split(/\s+/);
    const type = words[0];
    words.splice(0, 1);

    switch (type) {
      case "v":
        // v: x y z
        let vertex = [parseFloat(words[0]), parseFloat(words[1]), parseFloat(words[2]), 1.0];
        if (preTransform) {
          vertex = vec4.transformMat4(vertex, preTransform);
        }
        v.push(vec3.fromValues(vertex[0], vertex[1], vertex[2]));
        break;
      case "vt":
        // vt: u v
        const texture = [parseFloat(words[0]), parseFloat(words[1])];
        vt.push(texture);
        break;
      case "vn":
        // vn: nx ny nz
        let normal = [parseFloat(words[0]), parseFloat(words[1]), parseFloat(words[2]), 0.0];
        if (preTransform) {
          normal = vec4.transformMat4(normal, preTransform);
        }
        vn.push(vec3.fromValues(normal[0], normal[1], normal[2]));
        break;
      case "f":
        // f: v1 v2 v3 v4 ...
        for (let i = 0; i < words.length - 2; i++) {
          triangle(words[0]);
          triangle(words[1 + i]);
          triangle(words[2 + i]);
        }
        break;
      default:
    }
  }

  return new Float32Array(vertices);
}
