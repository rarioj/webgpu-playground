export const assetArray = [
  {
    name: "shader",
    url: "./shaders/shader.wgsl",
    type: "text",
  },
  {
    name: "image",
    url: "./assets/images/10-1024.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/15-1024.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/20-1024.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/25-1024.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/30-1024.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/35-1024.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/40-1024.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/45-1024.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/50-1024.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/55-1024.webp",
    type: "blob",
    group: true,
  },
  {
    // tile
    name: "image",
    url: `./assets/images/143-1024.webp`,
    type: "blob",
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
