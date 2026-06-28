const __cubemapName = "bambanani_sunset";

export const resourceArray = [
  {
    name: "shader",
    url: "./shaders/shader.wgsl",
    type: "text",
  },
  {
    name: "sky",
    url: "./shaders/sky.wgsl",
    type: "text",
  },
  {
    name: "alert",
    url: "./shaders/alert.wgsl",
    type: "text",
  },
  {
    name: "hud",
    url: "./shaders/hud.wgsl",
    type: "text",
  },
  {
    name: "weapon",
    url: "./shaders/gun.wgsl",
    type: "text",
  },
  {
    name: "statue",
    url: "./assets/models/Knight_V1/18489_Knight_V1_.obj",
    type: "text",
  },
  {
    name: "gun",
    url: "./assets/models/92-sci_fi_gun/scifi_gun.obj",
    type: "text",
  },
  {
    // +x (right)
    name: "skyImages",
    url: `./assets/cubemaps/${__cubemapName}/face_px_right.webp`,
    type: "blob",
    group: true,
  },
  {
    // -x (left)
    name: "skyImages",
    url: `./assets/cubemaps/${__cubemapName}/face_nx_left.webp`,
    type: "blob",
    group: true,
  },
  {
    // +y (top)
    name: "skyImages",
    url: `./assets/cubemaps/${__cubemapName}/face_py_top.webp`,
    type: "blob",
    group: true,
  },
  {
    // -y (bottom)
    name: "skyImages",
    url: `./assets/cubemaps/${__cubemapName}/face_ny_bottom.webp`,
    type: "blob",
    group: true,
  },
  {
    // +z (front)
    name: "skyImages",
    url: `./assets/cubemaps/${__cubemapName}/face_pz_front.webp`,
    type: "blob",
    group: true,
  },
  {
    // -z (back)
    name: "skyImages",
    url: `./assets/cubemaps/${__cubemapName}/face_nz_back.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "hudImage",
    url: "./assets/huds/hud3.png",
    type: "blob",
  },
  {
    name: "gunImage",
    url: "./assets/images/143-16.webp",
    type: "blob",
  },
];

[50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 1073].forEach((value1, index1) => {
  [512, 256, 128, 64, 32, 16].forEach((value2, index2) => {
    resourceArray.push({
      name: "assetImages",
      url: `./assets/images/${value1}-${value2}.webp`,
      type: "blob",
      group: "" + value1,
    });
  });
});

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
