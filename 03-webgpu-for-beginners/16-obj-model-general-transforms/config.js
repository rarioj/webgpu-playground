export const config = {};

config.resources = [
  {
    name: "shaderCode",
    url: "./shaders/shader.wgsl",
    type: "text",
  },
  {
    name: "raytracerCode",
    url: "./shaders/raytracer.wgsl",
    type: "text",
  },
  {
    name: "statueObj",
    url: "./assets/models/Hades_V1/16777_Hades_V1_NEW.obj",
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
