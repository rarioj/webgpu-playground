import { initGPU, makeShaderModule } from "./library/helper/webgpu.js";
import { loadResources } from "./library/helper/utility.js";

const canvas = document.querySelector("canvas");
const { device, context } = await initGPU({ canvas });
const resources = await loadResources([
  {
    name: "shader",
    url: "./shader.wgsl",
    type: "text",
  },
]);
const shaderModule = makeShaderModule(device, resources.shader);

// --- Set up render pipeline
const renderPipeline = device.createRenderPipeline({
  label: "Hardcoded red triangle pipeline",
  layout: "auto",
  vertex: {
    module: shaderModule,
    entryPoint: "vertexMain",
  },
  fragment: {
    module: shaderModule,
    entryPoint: "fragmentMain",
    targets: [{ format: context.getConfiguration().format }],
  },
});

// --- Set up render pass descriptor
const renderPassDesc = {
  label: "Basic canvas render pass",
  colorAttachments: [
    {
      // view: populated on render
      clearValue: [0.3, 0.3, 0.3, 1.0],
      loadOp: "clear",
      storeOp: "store",
    },
  ],
};

function render() {
  const encoder = device.createCommandEncoder({
    label: "Command encoder",
  });

  renderPassDesc.colorAttachments[0].view = context.getCurrentTexture().createView();
  const renderPass = encoder.beginRenderPass(renderPassDesc);
  renderPass.setPipeline(renderPipeline);
  renderPass.draw(3);
  renderPass.end();

  device.queue.submit([encoder.finish()]);
}

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const canvas = entry.target;
    const width = entry.contentBoxSize[0].inlineSize;
    const height = entry.contentBoxSize[0].blockSize;
    canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
    canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
  }
  render();
});
resizeObserver.observe(canvas);
