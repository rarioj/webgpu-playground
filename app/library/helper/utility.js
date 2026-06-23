/**
 * @type {URLSearchParams}
 */
const __queryParameters = new URLSearchParams(location.search);

/**
 * @param {string} key
 * @param {any} [fallback]
 * @returns {any}
 */
export function getQueryValue(key, fallback = null) {
  return __queryParameters.has(key) ? __queryParameters.get(key) : fallback;
}

/**
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function getRandomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {HTMLProgressElement}
 */
export function createProgressBar(options = {}) {
  const {
    container = document.body,
    style = {
      position: "fixed",
      top: "0",
    },
  } = options;

  const progress = document.createElement("progress");
  progress.max = 100;
  // progress.value = 0;

  if (container instanceof HTMLElement) {
    container.appendChild(progress);
  }

  Object.assign(progress.style, style);
  return progress;
}

/**
 * @async
 * @param {{name: string, group: boolean, url: string, type: string}[]} resources
 * @returns {Object.<string, any>}
 */
export async function loadResources(resources) {
  let fetched = 0;

  const progress = createProgressBar();
  const results = {};
  for (const resource of resources) {
    const downloaded = await fetch(resource.url)
      .then((response) => {
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
  progress.remove();
  return results;
}

/**
 * @param {string} text
 * @returns {Float32Array}
 */
export function parseObjCode(text) {
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
    const vTarget = v[parseInt(vtn[0]) - 1];
    vertices.push(vTarget[0]); // x
    vertices.push(vTarget[1]); // y
    vertices.push(vTarget[2]); // z
    const vtTarget = vt[parseInt(vtn[1]) - 1];
    vertices.push(vtTarget[0]); // u
    vertices.push(vtTarget[1]); // v
  };

  for (const line of lines) {
    const words = line.trim().split(/\s+/);
    const type = words[0];
    words.splice(0, 1);

    switch (type) {
      case "v":
        // v: x y z
        v.push([parseFloat(words[0]), parseFloat(words[1]), parseFloat(words[2])]);
        break;
      case "vt":
        // vt: u v
        vt.push([parseFloat(words[0]), parseFloat(words[1])]);
        break;
      case "vn":
        // vn: x y z
        vn.push([parseFloat(words[0]), parseFloat(words[1]), parseFloat(words[2])]);
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
