import { getCookie, setCookie, getQueryValue } from "./src/utilities/helpers.js";
import { loadAssets } from "./src/utilities/assets.js";
import { createModalElement } from "./src/utilities/elements.js";
import { pages } from "./pages.js";

import showdown from "./src/external/showdown.js";

const currentTheme = getCookie("theme") || "dark";
document.documentElement.setAttribute("data-theme", currentTheme);
const allIcons = document.querySelectorAll("img.theme-toggle");
for (const icon of allIcons) {
  icon.src = icon.dataset[`${currentTheme}Icon`];
}

const button = document.createElement("a");
button.title = "Theme toggle";
button.innerText = currentTheme === "dark" ? "🌕" : "🌘";
button.onclick = () => {
  const toggleTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", toggleTheme);
  setCookie("theme", toggleTheme);
  button.innerText = toggleTheme === "dark" ? "🌕" : "🌘";
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

const main = document.querySelector("main");
const section = document.querySelector("section");
section.innerHTML = converter.makeHtml(markdown.content.data);

const header = document.querySelector("header");
const heading1 = document.querySelector("h1");
const heading6 = document.querySelector("h6");
if (header) {
  if (heading1) {
    header.appendChild(heading1);
  }
  if (heading6) {
    header.appendChild(heading6);
    document.title = heading6 ? heading6.innerText : "WebGPU Playground";
    if (page && available) {
      let pagePath = `?page=${page}`;
      let pageIndex = 0;
      const crumbsNow = heading6.innerText.split(" • ");
      const crumbsFinal = [];
      while (pageIndex < crumbsNow.length) {
        crumbsFinal.push(`<a href="./index.html${pagePath}">${crumbsNow[pageIndex++]}</a>`);
        pagePath = pagePath.substring(0, pagePath.lastIndexOf("/"));
      }
      heading6.innerHTML = crumbsFinal.toReversed().join(" » ");
    }
  }
}

const article = document.querySelector("article");

if (available) {
  if (pages[page].includes("script")) {
    const script = document.createElement("script");
    script.src = `${path}/script.js`;
    script.type = "module";
    document.body.appendChild(script);

    if (!pages[page].includes("fullscreen")) {
      const blockquote = document.querySelector("blockquote");
      if (blockquote) {
        article.prepend(...blockquote.children);
        blockquote.remove();
      }
    }
  }

  if (pages[page].includes("fullscreen")) {
    main.style.padding = "0";
    const modal = createModalElement(header, section, { container: main, open: false });
    if (new URLSearchParams(location.search).size === 1) {
      modal.open = true;
    }

    const hrs = document.querySelectorAll("hr");
    hrs.forEach((element) => {
      element.remove();
    });

    const footer = document.querySelector("footer");
    footer.classList.add("fullscreen-mode");

    const firstListParent = document.querySelectorAll("ul")[0];
    const firstListItem = document.querySelectorAll("li")[0];
    firstListItem.remove();
    {
      const blockquote = document.querySelector("blockquote");
      if (blockquote) {
        const li = document.createElement("li");
        li.appendChild(...blockquote.children);
        firstListParent.appendChild(li);
        blockquote.remove();
      }
    }
    {
      const li = document.createElement("li");
      const button = document.createElement("a");
      button.title = "Pop-up info modal";
      button.innerHTML = "<strong>ℹ️</strong>";
      button.onclick = (event) => {
        modal.open = true;
        event.preventDefault();
      };
      li.appendChild(button);
      firstListParent.appendChild(li);
    }
  }

  if (pages[page].includes("noarticle")) {
    article.remove();
  }
} else {
  article.remove();
}
