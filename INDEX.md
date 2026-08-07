# WebGPU Playground

## Overview

This repository documents my personal journey of learning WebGPU from scratch. Because I primarily develop, test, and render examples on mobile devices (phones, tablets, and similar hardware), all code is written using only HTML, CSS, JavaScript, and WGSL without build tools, package managers, or framework-specific tooling.

Many WebGPU learning resources and articles use TypeScript as the primary language. Where applicable, those examples are rewritten in plain JavaScript to keep the codebase lightweight, accessible, and easy to run in any modern browser.

Any external libraries are loaded directly from within the HTML file, with no reliance on Node.js, `package.json`, bundlers, transpilers, or other development tooling.

## Materials

### Learned

- [x] [Your first WebGPU app](https://codelabs.developers.google.com/your-first-webgpu-app) by Brandon Jones, François Beaufort → [Conway's Game of Life](./index.html?page=01-conways-game-of-life)
- [x] [WebGPU — All of the cores, none of the canvas](https://surma.dev/things/webgpu/) by Surma → [Collision Simulation](./index.html?page=02-collision-simulation)
- [x] 🎥 [Introduction to WebGPU - CIS 565 GPU Programming Fall 2023](https://www.youtube.com/watch?v=41pC1MLMVdA) by Brandon Jones (Toji)
- [x] 🎥 [WebGPU Tutorial](https://www.youtube.com/playlist?list=PLVHfUzm5DIVCZxjmaZsBXEXoohzSqeCnV) by Orillusion → [Learning Materials](./index.html?page=04-webgpu-tutorial)

### Learning

- [ ] 🎥 [WebGPU for Beginners](https://www.youtube.com/playlist?list=PLn3eTxaOtL2Ns3wkxdyS3CiqkJuwQdZzn) by The Graphics Guy → [Learning Materials](./index.html?page=03-webgpu-for-beginners)

### To Learn

Not in any particular order.

- [WebGPU Fundamentals](https://webgpufundamentals.org/)
- [From 0 to glTF with WebGPU: The First Triangle](https://www.willusher.io/graphics/2023/04/10/0-to-gltf-triangle/)
- [Efficiently rendering glTF models](https://toji.dev/webgpu-gltf-case-study/)
- [WebGPU Engine from Scratch](https://dev.to/ndesmic/webgpu-engine-from-scratch-1-basic-rendering-51cl) by ndesmic
- [WebGPU game series](https://blog.batteson.com/2023/06/04/webgpu-game-1-boilerplate) by battesonb
- #️⃣ [WebGPU Examples](https://github.com/tsherif/webgpu-examples) by Tarek Sherif
- #️⃣ [WebGPU Samples](https://github.com/webgpu/webgpu-samples) by Austin Eng
- #️⃣ [RedGPU](https://github.com/redcamel/RedGPU) by @RedCamel15
- 🎥 [WebGPU Graphics Programming Step-by-Step](https://www.youtube.com/playlist?list=PL_UrKDEhALdKh0118flOjuAnVIGKFUJXN)
- 🎥 [WebGPU](https://www.youtube.com/playlist?list=PLTEbuqk52pIDtLeBrv0GcuHT8fy5RpLPZ) by Visionary 3D
- 🎥 [WebGPU Game Dev](https://www.youtube.com/playlist?list=PLCnmpqh8sKKynYSJqrrC0nWwPB3OVf5lt) by 3Angle

## Other Resources

### Documentation and Specification

- [WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) - The MDN Web Docs site provides information about Open Web technologies including HTML, CSS, and APIs for both Web sites and progressive web apps.
- [W3C GPU for the Web Community Group](https://github.com/gpuweb/gpuweb) - The repository for the W3C GPU for the Web Community Group WebGPU API and WebGPU Shading Language (WGSL) specifications. → [WebGPU (Published Version)](https://www.w3.org/TR/webgpu/) • [WebGPU (Editor's Draft)](https://gpuweb.github.io/gpuweb/) • [WGSL (Published Version)](https://www.w3.org/TR/WGSL/) • [WGSL (Editor's Draft)](https://gpuweb.github.io/gpuweb/wgsl/) • [WebGPU API Reference](https://gpuweb.github.io/types/index.html)

### Tools and Libraries

- [Can I use WebGPU?](https://caniuse.com/webgpu)
- [Showdown](https://github.com/showdownjs/showdown) - A JavaScript Markdown to HTML converter, based on the original works by John Gruber.
- [Pico ✨](https://picocss.com/) - A minimalist and lightweight starter kit that prioritizes semantic syntax, making every HTML element responsive and elegant by default.
- [wgpu-matrix](https://wgpu-matrix.org/) - Fast 3D math library for WebGPU.
- [Cube Map Converter](https://labs.xo3d.co.uk/cube-map-converter/) by XO3D LABS.
- [Desmos](https://www.desmos.com/) - Beautiful free math.

### Assets

- [Lorem Picsum](https://picsum.photos/) - The Lorem Ipsum for photos.
- [PNGWing](https://www.pngwing.com/) - Transparent background images for designers.
- [Free3D](https://free3d.com/) - Free 3D Models, TF3DM is the go to place where you can share your free 3d assets and download instantly any you like.
- [Poly Haven](https://polyhaven.com/) - The public 3D asset library.
- [Pixabay](https://pixabay.com/) - Stunning royalty-free images & royalty-free stock.