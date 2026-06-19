import { getRandomBetween } from "./library/helper/utility.js";

export const resourceArray = [
  {
    name: "shader",
    url: "./shader.wgsl",
    type: "text",
  },
  {
    name: "image",
    url: `https://picsum.photos/seed/${getRandomBetween(1, 20)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/seed/${getRandomBetween(21, 40)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/seed/${getRandomBetween(41, 60)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/seed/${getRandomBetween(61, 80)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/seed/${getRandomBetween(81, 100)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/seed/${getRandomBetween(101, 120)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/seed/${getRandomBetween(121, 140)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/seed/${getRandomBetween(141, 160)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/seed/${getRandomBetween(161, 180)}/256/256`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `https://picsum.photos/seed/${getRandomBetween(180, 200)}/256/256`,
    type: "blob",
    group: true,
  },
];
