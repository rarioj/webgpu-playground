# WebGPU Playground

> My personal journey of learning WebGPU from scratch.

## Overview

This repository documents my personal journey of learning WebGPU. Because I primarily develop, test, and render examples on mobile devices (phones, tablets, and similar hardware), all code is written using only HTML, CSS, JavaScript, and WGSL—without build tools, package managers, or framework-specific tooling.

Many WebGPU learning resources and articles use TypeScript as the primary language. Where applicable, those examples are rewritten in plain JavaScript to keep the codebase lightweight, accessible, and easy to run in any modern browser.

Any external libraries are loaded directly from within the HTML file, with no reliance on Node.js, `package.json`, bundlers, transpilers, or other development tooling.

## Materials

### ✅ Learned

- [Your first WebGPU app](https://codelabs.developers.google.com/your-first-webgpu-app) by Brandon Jones, François Beaufort → [Conway's Game of Life](./01-conways-game-of-life/index.html)
- [WebGPU — All of the cores, none of the canvas](https://surma.dev/things/webgpu/) by Surma → [Collision Simulation](./02-collision-simulation/index.html)

### 🏗️ Learning

- 🎥 [WebGPU for Beginners](https://www.youtube.com/playlist?list=PLn3eTxaOtL2Ns3wkxdyS3CiqkJuwQdZzn) by The Graphics Guy → [Hello Triangle!](./03-webgpu-for-beginners/01-hello-triangle/index.html) | [Vertex Buffers](./03-webgpu-for-beginners/02-vertex-buffers/index.html) | [Transformations](./03-webgpu-for-beginners/03-transformations/index.html) | [Textures](./03-webgpu-for-beginners/04-textures/index.html) | [First Person Camera](./03-webgpu-for-beginners/05-first-person-camera/index.html) | [Multiple Triangles + Depth Testing](./03-webgpu-for-beginners/06-multiple-triangles-depth-testing/index.html) | [Multiple Objects + Bind Groups and Bindings](./03-webgpu-for-beginners/07-multiple-objects-bind-groups-layouts/index.html) | [Loading OBJ Models](./03-webgpu-for-beginners/08-obj-models/index.html) | [Cubemaps](./03-webgpu-for-beginners/09-cubemaps/index.html)
- [WebGPU Fundamentals](https://webgpufundamentals.org/) → [Drawing triangles to textures](./04-webgpu-fundamentals/01-drawing-triangles-to-textures/index.html) | [Run computations on the GPU](./04-webgpu-fundamentals/02-run-computations-on-gpu/index.html)

### 📝 To Learn

Not in any particular order.

- [From 0 to glTF with WebGPU: The First Triangle](https://www.willusher.io/graphics/2023/04/10/0-to-gltf-triangle/)
- [Efficiently rendering glTF models](https://toji.dev/webgpu-gltf-case-study/)
- #️⃣ [WebGPU Examples](https://github.com/tsherif/webgpu-examples) by Tarek Sherif
- #️⃣ [WebGPU Samples](https://github.com/webgpu/webgpu-samples) by Austin Eng
- #️⃣ [RedGPU](https://github.com/redcamel/RedGPU) by @RedCamel15
- 🎥 [Introduction to WebGPU - CIS 565 GPU Programming Fall 2023](https://www.youtube.com/watch?v=41pC1MLMVdA) by Brandon Jones (Toji)
- 🎥 [WebGPU Graphics Programming Step-by-Step](https://www.youtube.com/playlist?list=PL_UrKDEhALdKh0118flOjuAnVIGKFUJXN)
- 🎥 [WebGPU](https://www.youtube.com/playlist?list=PLTEbuqk52pIDtLeBrv0GcuHT8fy5RpLPZ) by Visionary 3D
- 🎥 [WebGPU Tutorial](https://www.youtube.com/playlist?list=PLVHfUzm5DIVCZxjmaZsBXEXoohzSqeCnV) by Orillusion
- 🎥 [WebGPU Game Dev](https://www.youtube.com/playlist?list=PLCnmpqh8sKKynYSJqrrC0nWwPB3OVf5lt) by 3Angle

## Other Resources

### Documentation and Specification

- WebGPU ﹝ [Published Version](https://www.w3.org/TR/webgpu/) | [Editor's Draft](https://gpuweb.github.io/gpuweb/) ﹞
- WebGPU Shading Language ﹝ [Published Version](https://www.w3.org/TR/WGSL/) | [Editor's Draft](https://gpuweb.github.io/gpuweb/wgsl/) ﹞
- [Can I use WebGPU?](https://caniuse.com/webgpu)
- [WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)

### Tools and Libraries

- [Showdown](https://github.com/showdownjs/showdown) - A JavaScript Markdown to HTML converter, based on the original works by John Gruber.
- [Pico CSS](https://picocss.com/) - A minimalist and lightweight starter kit that prioritizes semantic syntax, making every HTML element responsive and elegant by default.
- [wgpu-matrix](https://wgpu-matrix.org/) - Fast 3D math library for WebGPU.
- [Cube Map Converter](https://labs.xo3d.co.uk/cube-map-converter/) by XO3D LABS.

### Assets

- [LoremFlickr](https://loremflickr.com/) - Free placeholder images.
- [PNGWing](https://www.pngwing.com/) - Transparent background images for designers.
- [Free3D](https://free3d.com/) - Free 3D Models, TF3DM is the go to place where you can share your free 3d assets and download instantly any you like.
- [Poly Haven](https://polyhaven.com/) - The public 3D asset library.
