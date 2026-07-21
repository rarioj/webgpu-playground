import { getCookie, setCookie, loadAssets, getQueryValue } from "./src/helper/utilities.js";
import { pages } from "./pages.js";

import showdown from "./src/external/showdown.js";

/**
 * @file
 */

const currentTheme = getCookie("theme") || "dark";
document.documentElement.setAttribute("data-theme", currentTheme);
const allIcons = document.querySelectorAll("img.theme-toggle");
for (const icon of allIcons) {
  icon.src = icon.dataset[`${currentTheme}Icon`];
}

const button = document.createElement("a");
button.ariaLabel = "Toggle theme";
button.innerText = currentTheme === "dark" ? "☀️" : "🌙";
button.style.cursor = "pointer";
button.style.textDecoration = "none";
button.style.fontSize = "24px";
button.onclick = () => {
  const toggleTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", toggleTheme);
  setCookie("theme", toggleTheme);
  button.innerText = toggleTheme === "dark" ? "☀️" : "🌙";
  const allIcons = document.querySelectorAll("img.theme-toggle");
  for (const icon of allIcons) {
    icon.src = icon.dataset[`${toggleTheme}Icon`];
  }
};
document.getElementById("theme-toggle").appendChild(button);

const page = getQueryValue("page", false);
const available = Object.hasOwn(pages, page);
const path = page && available ? `./${page}` : ".";
const markdown = await loadAssets([{ name: "content", url: `${path}/INDEX.md`, type: "text" }]);
const converter = new showdown.Converter({ openLinksInNewWindow: false, tasklists: true, parseImgDimensions: true });
document.querySelector("section").innerHTML = converter.makeHtml(markdown.content);

if (available && pages[page]) {
  const script = document.createElement("script");
  script.src = `${path}/script.js`;
  script.type = "module";
  document.body.appendChild(script);
}

const breadcrumb = document.querySelector("h6");
document.title = breadcrumb ? breadcrumb.innerText : "WebGPU Playground";
