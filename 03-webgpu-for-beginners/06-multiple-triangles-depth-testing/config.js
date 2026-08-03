import { getQueryValue } from "../../src/utilities/helpers.js";

export const assetArray = [
  {
    name: "shader",
    url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
    type: "text",
  },
  {
    name: "image",
    url: "./assets/images/10-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/15-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/20-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/25-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/30-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/35-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/40-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/45-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/50-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/55-1024.webp",
    type: "bitmap",
    group: true,
  },
];

export const triangleVertices = [
  //x, y, z, u, v
  // triangle 1, point 1
  0.0, 0.0, 0.5, 0.5, 0.0,
  // triangle 1, point 2
  0.0, -0.5, -0.5, 0.0, 1.0,
  // triangle 1, point 2
  0.0, 0.5, -0.5, 1.0, 1.0,
];
