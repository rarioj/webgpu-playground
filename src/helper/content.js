import { loadAssets, getCookie, setCookie } from "./utilities.js";

import showdown from "https://cdn.jsdelivr.net/npm/showdown@2.1.0/+esm";

/**
 * @file
 */

/**
 * @param {string} mdFile
 * @param {HTMLElement} container
 * @param {Object} showdownOptions {@link https://github.com/showdownjs/showdown/wiki/Showdown-options|Showdown Options}
 */
export async function serveMarkdown(
  mdFile,
  container = document.body,
  showdownOptions = { openLinksInNewWindow: false, tasklists: true, parseImgDimensions: true },
) {
  const assets = await loadAssets([{ name: "content", url: mdFile, type: "text" }]);
  const converter = new showdown.Converter(showdownOptions);
  container.innerHTML = converter.makeHtml(assets.content);
}

/**
 * @param {HTMLElement} container
 */
export function applyThemeCreateToggle(container = document.body) {
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

  if (container instanceof HTMLElement) {
    container.appendChild(button);
  }
}
