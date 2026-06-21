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
    url: `https://picsum.photos/id/${getRandomBetween(1, 10)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(11, 20)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(21, 30)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(31, 40)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(41, 50)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(51, 60)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(61, 70)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(71, 80)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(81, 90)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(91, 100)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    // tile
    name: "image",
    // url: `https://picsum.photos/id/143/256/256`,
    // url: `https://picsum.photos/id/210/256/256`,
    url: `https://picsum.photos/id/307/256/256`,
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
