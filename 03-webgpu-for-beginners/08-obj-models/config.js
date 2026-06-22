import { getRandomBetween } from "./library/helper/utility.js";

export const resourceArray = [
  {
    name: "shader",
    url: "./shader.wgsl",
    type: "text",
  },
  {
    name: "image",
    url: `./assets/images/autumn${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/bird${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/building${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/kitten${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/mountain${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/puppy${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/spring${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/summer${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/waterfall${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/winter${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    // tile
    name: "image",
    url: `./assets/tiles/wood1.webp`,
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
