import { getQueryValue } from "../../src/helper/utilities.js";

let statueObjPath = "./assets/models/Apollo_V1/16771_Apollo_V1_NEW.obj";
let statueObjScale = [0.25, 0.25, 0.25];

switch (getQueryValue("statue", "apollo")) {
  case "apollo":
    statueObjPath = "./assets/models/Apollo_V1/16771_Apollo_V1_NEW.obj";
    statueObjScale = [0.25, 0.25, 0.25];
    break;
  case "ballerina":
    statueObjPath = "./assets/models/Ballerina_V1/22048_Ballerina_V1.obj";
    statueObjScale = [0.4, 0.4, 0.4];
    break;
  case "horus":
    statueObjPath = "./assets/models/Horus_V1/16786_Horus_V1.obj";
    statueObjScale = [0.25, 0.25, 0.25];
    break;
  case "hussar":
    statueObjPath = "./assets/models/Hussar_V1/18958_Hussar_V1.obj";
    statueObjScale = [0.25, 0.25, 0.25];
    break;
  case "knight":
    statueObjPath = "./assets/models/Knight_V1/18489_Knight_V1_.obj";
    statueObjScale = [0.15, 0.15, 0.15];
    break;
  case "rocksinger":
    statueObjPath = "./assets/models/Rock_singer_V1/18869_Rock_singer_V1_NEW.obj";
    statueObjScale = [0.15, 0.15, 0.15];
    break;
  default:
    break;
}

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
    name: "statueObj",
    url: statueObjPath,
    type: "text",
  },
  {
    // +x (right)
    name: "skyImages",
    url: `./assets/cubemaps/lakeside_sunrise/face_px_right.webp`,
    type: "blob",
    group: true,
  },
  {
    // -x (left)
    name: "skyImages",
    url: `./assets/cubemaps/lakeside_sunrise/face_nx_left.webp`,
    type: "blob",
    group: true,
  },
  {
    // +y (top)
    name: "skyImages",
    url: `./assets/cubemaps/lakeside_sunrise/face_py_top.webp`,
    type: "blob",
    group: true,
  },
  {
    // -y (bottom)
    name: "skyImages",
    url: `./assets/cubemaps/lakeside_sunrise/face_ny_bottom.webp`,
    type: "blob",
    group: true,
  },
  {
    // +z (front)
    name: "skyImages",
    url: `./assets/cubemaps/lakeside_sunrise/face_pz_front.webp`,
    type: "blob",
    group: true,
  },
  {
    // -z (back)
    name: "skyImages",
    url: `./assets/cubemaps/lakeside_sunrise/face_nz_back.webp`,
    type: "blob",
    group: true,
  },
];

config.statueScale = statueObjScale;
