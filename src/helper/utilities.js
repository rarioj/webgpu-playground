import { createProgressBar, createModal } from "./elements.js";

/**
 * @file
 */

/**
 * @param {string} key
 * @param {any} [fallback]
 * @returns {any}
 */
export function getQueryValue(key, fallback = undefined) {
  if (!(getQueryValue.searchParameters instanceof URLSearchParams)) {
    getQueryValue.searchParameters = new URLSearchParams(location.search);
  }
  return getQueryValue.searchParameters.has(key) ? getQueryValue.searchParameters.get(key) : fallback;
}

/**
 * @param {string} name
 * @param {string} value
 * @param {number} [days]
 */
export function setCookie(name, value, days = 30) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax; Secure`;
}

/**
 * @param {string} name
 * @returns {string}
 */
export function getCookie(name) {
  const cookies = document.cookie.split("; ");
  for (let i = 0; i < cookies.length; i++) {
    const [key, value] = cookies[i].split("=");
    if (decodeURIComponent(key) === name) {
      return decodeURIComponent(value);
    }
  }
  return "";
}

/**
 * @typedef {Object} AssetDescriptor
 * @property {string} name
 * @property {string} url
 * @property {string} type
 * @property {string|boolean} [group]
 */

/**
 * @typedef {string|{group: string, data: string}} AssetStringResult
 */

/**
 * @typedef {Blob|{group: string, data: Blob}} AssetBlobResult
 */

/**
 * @typedef {AssetStringResult|AssetStringResult[]|AssetBlobResult|AssetBlobResult[]} AssetResults
 */

/**
 * @async
 * @param {AssetDescriptor[]} assets
 * @returns {Object.<string, AssetResults>}
 */
export async function loadAssets(assets) {
  let fetched = 0;

  const { wrapper, caption, progress } = createProgressBar();

  /** @type {Object.<string, AssetResults>} */
  const results = {};

  try {
    for (const asset of assets) {
      const downloaded = await fetch(asset.url)
        .then((response) => {
          caption.ariaBusy = true;
          caption.innerText = asset.url.split("/").pop();
          if (!response.ok) {
            throw `Invalid asset URL: ${asset.url}`;
          }
          return response[asset.type]();
        })
        .then((data) => {
          fetched++;
          progress.value = (fetched / assets.length) * 100;
          return data;
        })
        .catch((error) => {
          throw `Unable to fetch asset URL: ${asset.url}`;
        });

      if (asset.group) {
        if (!Array.isArray(results[asset.name])) {
          results[asset.name] = [];
        }
        if (typeof asset.group === "string") {
          results[asset.name].push({
            group: asset.group,
            data: downloaded,
          });
        } else {
          results[asset.name].push(downloaded);
        }
      } else {
        results[asset.name] = downloaded;
      }
    }
  } catch (error) {
    createModal(error, {
      title: "🛑 Load Asset Error",
    });
    console.error(error);
  }

  progress.value = 100;
  caption.ariaBusy = false;
  caption.innerText = "";
  setTimeout(() => {
    wrapper.remove();
  }, 100);

  return results;
}
