import { loadResources } from "./app/library/helper/utility.js";
import showdown from "https://cdn.jsdelivr.net/npm/showdown@2.1.0/+esm";

const element = document.querySelector("section");
const resources = await loadResources([
  {
    name: "content",
    url: "./README.md",
    type: "text",
  },
]);
const converter = new showdown.Converter({ openLinksInNewWindow: false });

element.innerHTML = converter.makeHtml(resources.content);
