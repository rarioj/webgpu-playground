export class BasicMesh {
  /**
   * @type {number}
   */
  vertexCount;

  /**
   * @type {GPUVertexBufferLayout}
   */
  bufferLayout;

  /**
   * @type {GPUBuffer}
   */
  bufferData;

  /**
   * @param {GPUDevice} device
   * @param {Float32Array} vertices x, y, z, u, v
   */
  constructor(device, vertices) {
    this.vertexCount = vertices.length / 5; // x, y, z, u, v

    this.bufferLayout = {
      arrayStride: 20, // 32-bit float - 4 bytes * 5 (x, y, z, u, v)
      attributes: [
        {
          shaderLocation: 0,
          format: "float32x3",
          offset: 0, // x, y, z
        },
        {
          shaderLocation: 1,
          format: "float32x2",
          offset: 12, // u, v (skip x, y, z)
        },
      ],
    };

    this.bufferData = device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    const data = new Float32Array(this.bufferData.getMappedRange());
    data.set(vertices);
    this.bufferData.unmap();
  }
}
