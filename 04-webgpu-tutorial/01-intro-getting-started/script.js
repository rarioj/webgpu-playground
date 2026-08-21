import { WebGPU } from "../../src/system/WebGPU.js";
import { createModalElement } from "../../src/utilities/elements.js";

try {
  const webgpu = await WebGPU.init();

  let content = "<header><h3>Hello WebGPU!</h3></header>";

  content += "<main><h4>GPU Adapter Features</h4><p>";
  webgpu.adapter.features.forEach((value) => {
    content += `<code>${value}</code><br />`;
  });
  content += "</p>";

  const limits = Object.getOwnPropertyNames(Object.getPrototypeOf(webgpu.adapter.limits));

  content += "<h4>GPU Adapter Limits</h4><p>";
  limits.forEach((key) => {
    if (key !== "constructor") {
      const limitName = key;
      const limitValue = webgpu.adapter.limits[key];
      content += `<code>${limitName} = ${limitValue}</code><br />`;
    }
  });
  content += "</p></main>";

  const article = document.querySelector("article");
  article.innerHTML = content;
} catch (error) {
  createModalElement("🛑 Error", error, { container: document.querySelector("main") });
  console.error(error);
}
