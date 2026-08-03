import { getQueryValue } from "../../src/utilities/helpers.js";

export const assetArray = [
  {
    name: "shader",
    url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
    type: "text",
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
  {
    name: "image",
    url: "./assets/images/60-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/65-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/70-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/75-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/80-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/85-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/90-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/95-1024.webp",
    type: "bitmap",
    group: true,
  },
  {
    // tile
    name: "image",
    url: `./assets/images/210-1024.webp`,
    type: "bitmap",
    group: true,
  },
  {
    // statue
    name: "statue",
    url: "./assets/models/Apollo_V1/16771_Apollo_V1_NEW.obj",
    type: "text",
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

export const tileVertices = [
  //x, y, z, u, v
  // triangle 1, point 1
  -0.5, -0.5, 0.0, 0.0, 0.0,
  // triangle 1, point 2
  0.5, -0.5, 0.0, 1.0, 0.0,
  // triangle 1, point 3
  0.5, 0.5, 0.0, 1.0, 1.0,
  // triangle 2, point 1
  0.5, 0.5, 0.0, 1.0, 1.0,
  // triangle 2, point 2
  -0.5, 0.5, 0.0, 0.0, 1.0,
  // triangle 2, point 3
  -0.5, -0.5, 0.0, 0.0, 0.0,
];
