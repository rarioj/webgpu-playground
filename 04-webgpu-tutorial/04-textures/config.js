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
  config.videoURL = "./assets/videos/Circles, Vibrant, Trance.mp4";
}

config.cubeVertexArray = [
  // x, y, z, u, v

  // face1, triangle1, point1
  +1, -1, +1, 1, 1,
  // face1, triangle1, point2
  -1, -1, +1, 0, 1,
  // face1, triangle1, point3
  -1, -1, -1, 0, 0,
  // face1, triangle2, point1
  +1, -1, -1, 1, 0,
  // face1, triangle2, point2
  +1, -1, +1, 1, 1,
  // face1, triangle2, point3
  -1, -1, -1, 0, 0,

  // face2, triangle1, point1
  +1, +1, +1, 1, 1,
  // face2, triangle1, point2
  +1, -1, +1, 0, 1,
  // face2, triangle1, point3
  +1, -1, -1, 0, 0,
  // face2, triangle2, point1
  +1, +1, -1, 1, 0,
  // face2, triangle2, point2
  +1, +1, +1, 1, 1,
  // face2, triangle2, point3
  +1, -1, -1, 0, 0,

  // face3, triangle1, point1
  -1, +1, +1, 1, 1,
  // face3, triangle1, point2
  +1, +1, +1, 0, 1,
  // face3, triangle1, point3
  +1, +1, -1, 0, 0,
  // face3, triangle2, point1
  -1, +1, -1, 1, 0,
  // face3, triangle2, point2
  -1, +1, +1, 1, 1,
  // face3, triangle2, point3
  +1, +1, -1, 0, 0,

  // face4, triangle1, point1
  -1, -1, +1, 1, 1,
  // face4, triangle1, point2
  -1, +1, +1, 0, 1,
  // face4, triangle1, point3
  -1, +1, -1, 0, 0,
  // face4, triangle2, point1
  -1, -1, -1, 1, 0,
  // face4, triangle2, point2
  -1, -1, +1, 1, 1,
  // face4, triangle2, point3
  -1, +1, -1, 0, 0,

  // face5, triangle1, point1
  +1, +1, +1, 1, 1,
  // face5, triangle1, point2
  -1, +1, +1, 0, 1,
  // face5, triangle1, point3
  -1, -1, +1, 0, 0,
  // face5, triangle2, point1
  -1, -1, +1, 0, 0,
  // face5, triangle2, point2
  +1, -1, +1, 1, 0,
  // face5, triangle2, point3
  +1, +1, +1, 1, 1,

  // face6, triangle1, point1
  +1, -1, -1, 1, 1,
  // face6, triangle1, point2
  -1, -1, -1, 0, 1,
  // face6, triangle1, point3
  -1, +1, -1, 0, 0,
  // face6, triangle2, point1
  +1, +1, -1, 1, 0,
  // face6, triangle2, point2
  +1, -1, -1, 1, 1,
  // face6, triangle2, point3
  -1, +1, -1, 0, 0,
];

config.cubeVertexCount = config.cubeVertexArray.length / 5; // x, y, z, u, v
