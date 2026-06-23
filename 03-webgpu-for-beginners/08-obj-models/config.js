export const resourceArray = [
  {
    name: "shader",
    url: "./shader.wgsl",
    type: "text",
  },
  {
    name: "image",
    url: "./assets/images/50-512.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/55-512.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/60-512.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/65-512.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/70-512.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/75-512.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/80-512.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/85-512.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/90-512.webp",
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: "./assets/images/95-512.webp",
    type: "blob",
    group: true,
  },
  {
    // tile
    name: "image",
    url: `./assets/images/210-512.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "model",
    url: "./assets/models/Apollo_V1/16771_Apollo_V1_NEW.obj",
    type: "text",
  },
];

export const vertexMap = {
  triangle: new Float32Array([
    //x, y, z, u, v
    // triangle 1, point 1
    0.0, 0.0, 0.5, 0.5, 0.0,
    // triangle 1, point 2
    0.0, -0.5, -0.5, 0.0, 1.0,
    // triangle 1, point 3
    0.0, 0.5, -0.5, 1.0, 1.0,
  ]),
  quad: new Float32Array([
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
  ]),
};
