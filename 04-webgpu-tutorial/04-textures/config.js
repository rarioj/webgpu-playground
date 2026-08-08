import { getQueryValue } from "../../src/utilities/helpers.js";

const textureType = getQueryValue("texture", "image");

export const config = {};

config.resources = [];

if (textureType === "video") {
  config.resources.push({
    name: "shaderCode",
    url: `./${getQueryValue("page")}/shaders/videoTexture.wgsl`,
    type: "text",
  });
} else {
  config.resources.push({
    name: "shaderCode",
    url: `./${getQueryValue("page")}/shaders/imageTexture.wgsl`,
    type: "text",
  });
}

if (textureType === "canvasGPU") {
  config.resources.push({
    name: "computeCode",
    url: `./${getQueryValue("page")}/shaders/collision.wgsl`,
    type: "text",
  });
}

if (textureType === "image") {
  config.resources.push({
    name: "image",
    url: "./assets/images/40-1024.webp",
    type: "bitmap",
    group: true,
  });
}

if (textureType === "video") {
  config.videoURL = "./assets/videos/circles-vibrant-trance-sample.mp4";
}
