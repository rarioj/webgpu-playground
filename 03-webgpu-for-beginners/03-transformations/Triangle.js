export class Triangle {
  /**
   * @type {GPUBuffer}
   */
  bufferData;

  /**
   * @type {GPUVertexBufferLayout}
   */
  bufferLayout;

  /**
   * @param {GPUDevice} device
   */
  constructor(device) {
    const vertices = new Float32Array([
      //x, y, z, r, g, b
      // red
      0.0, 0.0, 0.5, 1.0, 0.0, 0.0,
      // green
      0.0, -0.5, -0.5, 0.0, 1.0, 0.0,
      // blue
      0.0, 0.5, -0.5, 0.0, 0.0, 1.0,
    ]);

    const descriptor = {
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    };

    this.bufferData = device.createBuffer(descriptor);
    this.bufferLayout = {
      arrayStride: 24, // 32-bit float - 4 bytes * 6 (x, y, z, r, g, b)
      attributes: [
        {
          shaderLocation: 0,
          format: "float32x3",
          offset: 0, // x, y, z
        },
        {
          shaderLocation: 1,
          format: "float32x3",
          offset: 12, // r, g, b (skip x, y, z)
        },
      ],
    };

    const data = new Float32Array(this.bufferData.getMappedRange());
    data.set(vertices);
    this.bufferData.unmap();
  }
}
