import { getQueryValue } from "../../src/utilities/helpers.js";

export const config = {};

config.assetArray = [
  {
    name: "shaderCode",
    url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
    type: "text",
  },
  {
    name: "cubemapCode",
    url: `./${getQueryValue("page")}/shaders/cubemap.wgsl`,
    type: "text",
  },
  {
    name: "strobeLightCode",
    url: `./${getQueryValue("page")}/shaders/strobeLight.wgsl`,
    type: "text",
  },
  {
    name: "hudCode",
    url: `./${getQueryValue("page")}/shaders/hud.wgsl`,
    type: "text",
  },
  {
    name: "gunCode",
    url: `./${getQueryValue("page")}/shaders/gun.wgsl`,
    type: "text",
  },
  {
    name: "statueObj",
    url: "./assets/models/Knight_V1/18489_Knight_V1_.obj",
    type: "text",
  },
  {
    name: "gunObj",
    url: "./assets/models/92-sci_fi_gun/scifi_gun.obj",
    type: "text",
  },
  {
    // +x (right)
    name: "skyImages",
    url: `./assets/cubemaps/bambanani_sunset/face_px_right.webp`,
    type: "bitmap",
    group: true,
  },
  {
    // -x (left)
    name: "skyImages",
    url: `./assets/cubemaps/bambanani_sunset/face_nx_left.webp`,
    type: "bitmap",
    group: true,
  },
  {
    // +y (top)
    name: "skyImages",
    url: `./assets/cubemaps/bambanani_sunset/face_py_top.webp`,
    type: "bitmap",
    group: true,
  },
  {
    // -y (bottom)
    name: "skyImages",
    url: `./assets/cubemaps/bambanani_sunset/face_ny_bottom.webp`,
    type: "bitmap",
    group: true,
  },
  {
    // +z (front)
    name: "skyImages",
    url: `./assets/cubemaps/bambanani_sunset/face_pz_front.webp`,
    type: "bitmap",
    group: true,
  },
  {
    // -z (back)
    name: "skyImages",
    url: `./assets/cubemaps/bambanani_sunset/face_nz_back.webp`,
    type: "bitmap",
    group: true,
  },
  {
    name: "hudImage",
    url: "./assets/others/hud4.webp",
    type: "bitmap",
  },
  {
    name: "gunImage",
    url: "./assets/others/gun.webp",
    type: "bitmap",
  },
];

[50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 1073].forEach((value1, index1) => {
  [1024, 512, 256, 128, 64, 32, 16].forEach((value2, index2) => {
    config.assetArray.push({
      name: "assetImages",
      url: `./assets/images/${value1}-${value2}.webp`,
      type: "bitmap",
      group: `${value1}`,
    });
  });
});

config.triangleVertices = [
  //x, y, z, u, v
  // triangle 1, point 1
  0.0, 0.0, 0.5, 0.5, 0.0,
  // triangle 1, point 2
  0.0, -0.5, -0.5, 0.0, 1.0,
  // triangle 1, point 3
  0.0, 0.5, -0.5, 1.0, 1.0,
];

config.tileVertices = [
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
