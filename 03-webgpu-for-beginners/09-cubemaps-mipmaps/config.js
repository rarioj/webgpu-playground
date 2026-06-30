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
    name: "model",
    url: "./assets/models/Ballerina_V1/22048_Ballerina_V1.obj",
    type: "text",
  },
  {
    // +x (right)
    name: "cubemap_px",
    url: `./assets/cubemaps/belfast_sunset_puresky/face_px_right.webp`,
    type: "blob",
  },
  {
    // -x (left)
    name: "cubemap_nx",
    url: `./assets/cubemaps/belfast_sunset_puresky/face_nx_left.webp`,
    type: "blob",
  },
  {
    // +y (top)
    name: "cubemap_py",
    url: `./assets/cubemaps/belfast_sunset_puresky/face_py_top.webp`,
    type: "blob",
  },
  {
    // -y (bottom)
    name: "cubemap_ny",
    url: `./assets/cubemaps/belfast_sunset_puresky/face_ny_bottom.webp`,
    type: "blob",
  },
  {
    // +z (front)
    name: "cubemap_pz",
    url: `./assets/cubemaps/belfast_sunset_puresky/face_pz_front.webp`,
    type: "blob",
  },
  {
    // -z (back)
    name: "cubemap_nz",
    url: `./assets/cubemaps/belfast_sunset_puresky/face_nz_back.webp`,
    type: "blob",
  },
];

[50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 307].forEach((value1, index1) => {
  [512, 256, 128, 64, 32, 16].forEach((value2, index2) => {
    resourceArray.push({
      name: "image",
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
