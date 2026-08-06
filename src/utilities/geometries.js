/**
 * @file
 */

/**
 * @param {Object} [options]
 * @param {number} [options.size]
 * @param {boolean} [options.useTexture]
 * @param {boolean} [options.useNormal]
 * @param {boolean} [options.indexed]
 * @returns {{vertices: Float32Array, indices?: Uint16Array}}
 */
export function createCubeGeometry(options = {}) {
  const { size = 1.0, useTexture = true, useNormal = true, indexed = true } = options;

  const half = size / 2;
  const face = [
    // Front face (Z+)
    { vertex: [-half, -half, half], normal: [0, 0, 1], texture: [0, 1] },
    { vertex: [half, -half, half], normal: [0, 0, 1], texture: [1, 1] },
    { vertex: [half, half, half], normal: [0, 0, 1], texture: [1, 0] },
    { vertex: [-half, half, half], normal: [0, 0, 1], texture: [0, 0] },
    // Back face (Z-)
    { vertex: [half, -half, -half], normal: [0, 0, -1], texture: [0, 1] },
    { vertex: [-half, -half, -half], normal: [0, 0, -1], texture: [1, 1] },
    { vertex: [-half, half, -half], normal: [0, 0, -1], texture: [1, 0] },
    { vertex: [half, half, -half], normal: [0, 0, -1], texture: [0, 0] },
    // Top face (Y+)
    { vertex: [-half, half, half], normal: [0, 1, 0], texture: [0, 1] },
    { vertex: [half, half, half], normal: [0, 1, 0], texture: [1, 1] },
    { vertex: [half, half, -half], normal: [0, 1, 0], texture: [1, 0] },
    { vertex: [-half, half, -half], normal: [0, 1, 0], texture: [0, 0] },
    // Bottom face (Y-)
    { vertex: [-half, -half, -half], normal: [0, -1, 0], texture: [0, 1] },
    { vertex: [half, -half, -half], normal: [0, -1, 0], texture: [1, 1] },
    { vertex: [half, -half, half], normal: [0, -1, 0], texture: [1, 0] },
    { vertex: [-half, -half, half], normal: [0, -1, 0], texture: [0, 0] },
    // Right face (X+)
    { vertex: [half, -half, half], normal: [1, 0, 0], texture: [0, 1] },
    { vertex: [half, -half, -half], normal: [1, 0, 0], texture: [1, 1] },
    { vertex: [half, half, -half], normal: [1, 0, 0], texture: [1, 0] },
    { vertex: [half, half, half], normal: [1, 0, 0], texture: [0, 0] },
    // Left face (X-)
    { vertex: [-half, -half, -half], normal: [-1, 0, 0], texture: [0, 1] },
    { vertex: [-half, -half, half], normal: [-1, 0, 0], texture: [1, 1] },
    { vertex: [-half, half, half], normal: [-1, 0, 0], texture: [1, 0] },
    { vertex: [-half, half, -half], normal: [-1, 0, 0], texture: [0, 0] },
  ];

  const baseVertices = [];
  for (const data of face) {
    const entry = [];
    entry.push(...data.vertex);
    if (useTexture) {
      entry.push(...data.texture);
    }
    if (useNormal) {
      entry.push(...data.normal);
    }
    baseVertices.push(entry);
  }

  const indices = [
    // Front
    0, 1, 2, 0, 2, 3,
    // Back
    4, 5, 6, 4, 6, 7,
    // Top
    8, 9, 10, 8, 10, 11,
    // Bottom
    12, 13, 14, 12, 14, 15,
    // Right
    16, 17, 18, 16, 18, 19,
    // Left
    20, 21, 22, 20, 22, 23,
  ];

  if (indexed) {
    const vertices = [];
    for (const v of baseVertices) {
      vertices.push(...v);
    }
    return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
  }

  const vertices = [];
  for (const index of indices) {
    vertices.push(...baseVertices[index]);
  }
  return { vertices: new Float32Array(vertices) };
}

/**
 * @param {Object} [options]
 * @param {number} [options.radius]
 * @param {number} [options.latitudes]
 * @param {number} [options.longitudes]
 * @param {boolean} [options.useTexture]
 * @param {boolean} [options.useNormal]
 * @param {boolean} [options.indexed]
 * @returns {{vertices: Float32Array, indices: Uint16Array}}
 */
export function createSphereGeometry(options = {}) {
  const { radius = 1.0, latitudes = 16, longitudes = 16, useTexture = true, useNormal = true, indexed = true } = options;

  const baseVertices = [];
  for (let lat = 0; lat <= latitudes; lat++) {
    const theta = (lat * Math.PI) / latitudes;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const v = 1.0 - lat / latitudes;

    for (let lon = 0; lon <= longitudes; lon++) {
      const phi = (lon * 2 * Math.PI) / longitudes;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;
      const u = lon / longitudes;

      const entry = [];
      entry.push(radius * x, radius * y, radius * z);
      if (useTexture) {
        entry.push(u, v);
      }
      if (useNormal) {
        entry.push(x, y, z);
      }
      baseVertices.push(entry);
    }
  }

  const indices = [];
  for (let lat = 0; lat < latitudes; lat++) {
    for (let lon = 0; lon < longitudes; lon++) {
      const first = lat * (longitudes + 1) + lon;
      const second = first + longitudes + 1;
      indices.push(first, first + 1, second);
      indices.push(second, first + 1, second + 1);
    }
  }

  if (indexed) {
    const vertices = [];
    for (const v of baseVertices) {
      vertices.push(...v);
    }
    return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
  }

  const vertices = [];
  for (const index of indices) {
    vertices.push(...baseVertices[index]);
  }
  return { vertices: new Float32Array(vertices) };
}
