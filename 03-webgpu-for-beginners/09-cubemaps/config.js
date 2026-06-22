import { getRandomBetween } from "./library/helper/utility.js";

const __cubemapName = "belfast_sunset_puresky";

export const resourceArray = [
  {
    name: "shader",
    url: "./shader.wgsl",
    type: "text",
  },
  {
    name: "cubemap",
    url: "./cubemap.wgsl",
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
    url: `./assets/tiles/wood2.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "model",
    url: "./assets/models/Ballerina_V1/22048_Ballerina_V1.obj",
    type: "text",
  },
  {
    // +x (right)
    name: "cubemap_px",
    url: `./assets/cubemaps/${__cubemapName}/face_px_right.webp`,
    type: "blob",
  },
  {
    // -x (left)
    name: "cubemap_nx",
    url: `./assets/cubemaps/${__cubemapName}/face_nx_left.webp`,
    type: "blob",
  },
  {
    // +y (top)
    name: "cubemap_py",
    url: `./assets/cubemaps/${__cubemapName}/face_py_top.webp`,
    type: "blob",
  },
  {
    // -y (bottom)
    name: "cubemap_ny",
    url: `./assets/cubemaps/${__cubemapName}/face_ny_bottom.webp`,
    type: "blob",
  },
  {
    // +z (front)
    name: "cubemap_pz",
    url: `./assets/cubemaps/${__cubemapName}/face_pz_front.webp`,
    type: "blob",
  },
  {
    // -z (back)
    name: "cubemap_nz",
    url: `./assets/cubemaps/${__cubemapName}/face_nz_back.webp`,
    type: "blob",
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
