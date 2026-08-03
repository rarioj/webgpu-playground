import { getQueryValue } from "../../src/utilities/helpers.js";

export const config = {};

config.resources = [
  {
    name: "shaderCode",
    url: `./${getQueryValue("page")}/shaders/shader.wgsl`,
    type: "text",
  },
];

config.cubeVertexArray = [
  // x, y, z, u, v

  // face1, triangle1, point1
  +1, -1, +1, 1, 1,
  // face1, triangle1, point2
  -1, -1, +1, 0, 1,
  // face1, triangle1, point3
  -1, -1, -1, 0, 0,
  // face1, triangle2, point1
  +1, -1, -1, 1, 0,
  // face1, triangle2, point2
  +1, -1, +1, 1, 1,
  // face1, triangle2, point3
  -1, -1, -1, 0, 0,

  // face2, triangle1, point1
  +1, +1, +1, 1, 1,
  // face2, triangle1, point2
  +1, -1, +1, 0, 1,
  // face2, triangle1, point3
  +1, -1, -1, 0, 0,
  // face2, triangle2, point1
  +1, +1, -1, 1, 0,
  // face2, triangle2, point2
  +1, +1, +1, 1, 1,
  // face2, triangle2, point3
  +1, -1, -1, 0, 0,

  // face3, triangle1, point1
  -1, +1, +1, 1, 1,
  // face3, triangle1, point2
  +1, +1, +1, 0, 1,
  // face3, triangle1, point3
  +1, +1, -1, 0, 0,
  // face3, triangle2, point1
  -1, +1, -1, 1, 0,
  // face3, triangle2, point2
  -1, +1, +1, 1, 1,
  // face3, triangle2, point3
  +1, +1, -1, 0, 0,

  // face4, triangle1, point1
  -1, -1, +1, 1, 1,
  // face4, triangle1, point2
  -1, +1, +1, 0, 1,
  // face4, triangle1, point3
  -1, +1, -1, 0, 0,
  // face4, triangle2, point1
  -1, -1, -1, 1, 0,
  // face4, triangle2, point2
  -1, -1, +1, 1, 1,
  // face4, triangle2, point3
  -1, +1, -1, 0, 0,

  // face5, triangle1, point1
  +1, +1, +1, 1, 1,
  // face5, triangle1, point2
  -1, +1, +1, 0, 1,
  // face5, triangle1, point3
  -1, -1, +1, 0, 0,
  // face5, triangle2, point1
  -1, -1, +1, 0, 0,
  // face5, triangle2, point2
  +1, -1, +1, 1, 0,
  // face5, triangle2, point3
  +1, +1, +1, 1, 1,

  // face6, triangle1, point1
  +1, -1, -1, 1, 1,
  // face6, triangle1, point2
  -1, -1, -1, 0, 1,
  // face6, triangle1, point3
  -1, +1, -1, 0, 0,
  // face6, triangle2, point1
  +1, +1, -1, 1, 0,
  // face6, triangle2, point2
  +1, -1, -1, 1, 1,
  // face6, triangle2, point3
  -1, +1, -1, 0, 0,
];

config.cubeVertexCount = config.cubeVertexArray.length / 5; // x, y, z, u, v
