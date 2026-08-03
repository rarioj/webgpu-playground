import { getQueryValue } from "../../src/utilities/helpers.js";

export const assetArray = [
  {
    name: "shader",
    url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
    type: "text",
  },
  {
    name: "cubemap",
    url: `./${getQueryValue("page")}/shaders/cubemap.wgsl`,
    type: "text",
  },
  {
    name: "statue",
    url: "./assets/models/Ballerina_V1/22048_Ballerina_V1.obj",
    type: "text",
  },
  {
    // +x (right)
    name: "cubemap_px",
    url: `./assets/cubemaps/belfast_sunset_puresky/face_px_right.webp`,
    type: "bitmap",
  },
  {
    // -x (left)
    name: "cubemap_nx",
    url: `./assets/cubemaps/belfast_sunset_puresky/face_nx_left.webp`,
    type: "bitmap",
  },
  {
    // +y (top)
    name: "cubemap_py",
    url: `./assets/cubemaps/belfast_sunset_puresky/face_py_top.webp`,
    type: "bitmap",
  },
  {
    // -y (bottom)
    name: "cubemap_ny",
    url: `./assets/cubemaps/belfast_sunset_puresky/face_ny_bottom.webp`,
    type: "bitmap",
  },
  {
    // +z (front)
    name: "cubemap_pz",
    url: `./assets/cubemaps/belfast_sunset_puresky/face_pz_front.webp`,
    type: "bitmap",
  },
  {
    // -z (back)
    name: "cubemap_nz",
    url: `./assets/cubemaps/belfast_sunset_puresky/face_nz_back.webp`,
    type: "bitmap",
  },
];

[50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 307].forEach((value1, index1) => {
  [1024, 512, 256, 128, 64, 32, 16].forEach((value2, index2) => {
    assetArray.push({
      name: "image",
      url: `./assets/images/${value1}-${value2}.webp`,
      type: "bitmap",
      group: `${value1}`,
    });
  });
});

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
