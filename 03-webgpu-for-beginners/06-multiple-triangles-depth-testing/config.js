import { getRandomBetween } from "./library/helper/utility.js";

export const resourceArray = [
  {
    name: "shader",
    url: "./shader.wgsl",
    type: "text",
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(1, 10)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(11, 20)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(21, 30)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(31, 40)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(41, 50)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(51, 60)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(61, 70)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(71, 80)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(81, 90)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/id/${getRandomBetween(91, 100)}/256/256`,
    type: "blob",
    group: true,
  },
];
