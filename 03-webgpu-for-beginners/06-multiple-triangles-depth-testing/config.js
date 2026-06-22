import { getRandomBetween } from "./library/helper/utility.js";

export const resourceArray = [
  {
    name: "shader",
    url: "./shader.wgsl",
    type: "text",
  },
  {
    name: "image",
    url: `./assets/images/autumn${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/bird${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/building${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/kitten${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/mountain${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/puppy${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/spring${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/summer${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/waterfall${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
  {
    name: "image",
    url: `./assets/images/winter${getRandomBetween(0, 9)}.webp`,
    type: "blob",
    group: true,
  },
];
