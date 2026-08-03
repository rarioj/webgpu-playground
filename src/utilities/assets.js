import { createProgressBarElement, createModalElement } from "./elements.js";

/**
 * @file
 */

/**
 * @typedef {Object} AssetDescriptor
 * @property {string} name
 * @property {string} url
 * @property {"text"|"blob"|"bitmap"} type
 * @property {string} [group]
 */

/**
 * @typedef {Object} AssetResource
 * @property {string} group
 * @property {string|Blob|ImageBitmap} data
 */

/** @type {Object.<string, string>} */
const SUPPORTED_ASSET_TYPES = {
  text: "text",
  blob: "blob",
  bitmap: "blob",
};

/**
 * @param {AssetDescriptor[]} assets
 * @param {boolean} [unpackOneItem]
 * @returns {Object.<string, AssetResource|AssetResource[]>}
 */
export async function loadAssets(assets, unpackOneItem = false) {
  let downloaded = 0;

  const { wrapper, status, progress } = createProgressBarElement();

  /** @type {Object.<string, AssetResource|AssetResource[]>} */
  const resources = {};

  try {
    for (let i = 0; i < assets.length; i++) {
      const group = assets[i].group || "__default__";
      const data = await fetch(assets[i].url)
        .then((response) => {
          status.ariaBusy = true;
          status.innerText = assets[i].url.split("/").pop();
          if (!response.ok) {
            throw new Error(`Invalid asset URL: ${assets[i].url}`);
          }
          const type = SUPPORTED_ASSET_TYPES[assets[i].type];
          return response[type]();
        })
        .then(async (resource) => {
          downloaded++;
          progress.value = (downloaded / assets.length) * 100;
          if (assets[i].type === "bitmap") {
            return await createImageBitmap(resource);
          }
          return resource;
        })
        .catch((error) => {
          throw new Error(`Unable to download asset URL: ${assets[i].url}`);
        });

      if (!Array.isArray(resources[assets[i].name])) {
        resources[assets[i].name] = [];
      }
      resources[assets[i].name].push({ group, data });
    }
  } catch (error) {
    createModalElement("🚫 Load Asset", error, { closable: false });
    console.error(error);
  }

  progress.value = 100;
  status.ariaBusy = false;
  status.innerText = "";
  setTimeout(() => {
    wrapper.remove();
  }, 100);

  if (unpackOneItem) {
    return Object.fromEntries(Object.entries(resources).map(([key, value]) => [key, value.length === 1 ? value[0] : value]));
  }

  return resources;
}
