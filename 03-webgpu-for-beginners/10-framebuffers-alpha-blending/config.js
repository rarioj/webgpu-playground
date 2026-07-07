import { mat4 } from "https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js";

export const config = {};

config.resources = [
  {
    name: "shaderCode",
    url: "./shaders/shader.wgsl",
    type: "text",
  },
  {
    name: "skyCode",
    url: "./shaders/sky.wgsl",
    type: "text",
  },
  {
    name: "alertCode",
    url: "./shaders/alert.wgsl",
    type: "text",
  },
  {
    name: "hudCode",
    url: "./shaders/hud.wgsl",
    type: "text",
  },
  {
    name: "statueObj",
    url: "./assets/models/Horus_V1/16786_Horus_V1.obj",
    type: "text",
  },
  {
    // +x (right)
    name: "skyImages",
    url: `./assets/cubemaps/beach_cloudy_bridge/face_px_right.webp`,
    type: "blob",
    group: true,
  },
  {
    // -x (left)
    name: "skyImages",
    url: `./assets/cubemaps/beach_cloudy_bridge/face_nx_left.webp`,
    type: "blob",
    group: true,
  },
  {
    // +y (top)
    name: "skyImages",
    url: `./assets/cubemaps/beach_cloudy_bridge/face_py_top.webp`,
    type: "blob",
    group: true,
  },
  {
    // -y (bottom)
    name: "skyImages",
    url: `./assets/cubemaps/beach_cloudy_bridge/face_ny_bottom.webp`,
    type: "blob",
    group: true,
  },
  {
    // +z (front)
    name: "skyImages",
    url: `./assets/cubemaps/beach_cloudy_bridge/face_pz_front.webp`,
    type: "blob",
    group: true,
  },
  {
    // -z (back)
    name: "skyImages",
    url: `./assets/cubemaps/beach_cloudy_bridge/face_nz_back.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "hudImage",
    url: "./assets/others/hud1.webp",
    type: "blob",
  },
];

[50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 766].forEach((value1, index1) => {
  [1024, 512, 256, 128, 64, 32, 16].forEach((value2, index2) => {
    config.resources.push({
      name: "assetImages",
      url: `./assets/images/${value1}-${value2}.webp`,
      type: "blob",
      group: "" + value1,
    });
  });
});

config.transform = {
  statue: () => {
    let transform = mat4.identity();
    transform = mat4.multiply(transform, mat4.scaling([0.15, 0.15, 0.15]));
    return transform;
  },
};

config.vertices = {
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
