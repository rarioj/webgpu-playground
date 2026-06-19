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
      //x, y, r, g, b
      // top corner (red)
      0.0, 0.5, 1.0, 0.0, 0.0,
      // bottom left corner (green)
      -0.5, -0.5, 0.0, 1.0, 0.0,
      // bottom right corner (blue)
      0.5, -0.5, 0.0, 0.0, 1.0,
    ]);

    const descriptor = {
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    };

    this.bufferData = device.createBuffer(descriptor);
    this.bufferLayout = {
      arrayStride: 20, // 32-bit float - 4 bytes * 5 (x, y, r, g, b)
      attributes: [
        {
          shaderLocation: 0,
          format: "float32x2",
          offset: 0, // x, y
        },
        {
          shaderLocation: 1,
          format: "float32x3",
          offset: 8, // r, g, b (skip x and y)
        },
      ],
    };

    const data = new Float32Array(this.bufferData.getMappedRange());
    data.set(vertices);
    this.bufferData.unmap();
  }
}
