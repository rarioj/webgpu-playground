import { getQueryValue } from "../../src/utilities/helpers.js";

export const config = {};

config.resources = [
  {
    name: "shaderCode",
    url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
    type: "text",
  },
  {
    name: "raytracerCode",
    url: `./${getQueryValue("page")}/shaders/raytracer.wgsl`,
    type: "text",
  },
  {
    // +x (right)
    name: "skyImages",
    url: `./assets/cubemaps/qwantani_night_puresky/face_px_right.webp`,
    type: "bitmap",
    group: true,
  },
  {
    // -x (left)
    name: "skyImages",
    url: `./assets/cubemaps/qwantani_night_puresky/face_nx_left.webp`,
    type: "bitmap",
    group: true,
  },
  {
    // +y (top)
    name: "skyImages",
    url: `./assets/cubemaps/qwantani_night_puresky/face_py_top.webp`,
    type: "bitmap",
    group: true,
  },
  {
    // -y (bottom)
    name: "skyImages",
    url: `./assets/cubemaps/qwantani_night_puresky/face_ny_bottom.webp`,
    type: "bitmap",
    group: true,
  },
  {
    // +z (front)
    name: "skyImages",
    url: `./assets/cubemaps/qwantani_night_puresky/face_pz_front.webp`,
    type: "bitmap",
    group: true,
  },
  {
    // -z (back)
    name: "skyImages",
    url: `./assets/cubemaps/qwantani_night_puresky/face_nz_back.webp`,
    type: "bitmap",
    group: true,
  },
];
