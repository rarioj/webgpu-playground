/**
 * @file
 */

/**
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {string} [options.id]
 * @param {string} [options.classname]
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @param {number} [options.forceDPR]
 * @param {boolean} [options.noWrapper]
 * @param {CSSStyleDeclaration} [options.wrapperStyle]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {{wrapper?: HTMLElement, canvas: HTMLCanvasElement}}
 */
export function createCanvasElement(options = {}) {
  createCanvasElement.id = createCanvasElement.id || 0;

  const {
    container = document.body,
    id = `default-canvas-${createCanvasElement.id++}`,
    classname = "default-canvas",
    width = window.innerWidth,
    height = window.innerHeight,
    forceDPR = false,
    noWrapper = false,
    wrapperStyle = {},
    style = {},
  } = options;

  const wrapper = document.createElement("div");
  wrapper.classList.add(`${classname}-wrapper`);
  wrapper.style.width = "100%";
  wrapper.style.height = "100%";
  wrapper.style.maxWidth = `${width}px`;
  wrapper.style.maxHeight = `${height}px`;
  Object.assign(wrapper.style, wrapperStyle);

  const dpr = forceDPR ? forceDPR : Math.min(2, window.devicePixelRatio) || 1;
  const canvas = document.createElement("canvas");
  canvas.id = id;
  canvas.classList.add(classname);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  Object.assign(canvas.style, style);

  if (noWrapper) {
    if (container instanceof HTMLElement) {
      container.appendChild(canvas);
    }
    return { canvas };
  }

  wrapper.appendChild(canvas);
  if (container instanceof HTMLElement) {
    container.appendChild(wrapper);
  }
  return { wrapper, canvas };
}

/**
 * @param {string|HTMLElement} title
 * @param {string|HTMLElement} content
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {string} [options.id]
 * @param {string} [options.classname]
 * @param {boolean} [options.open]
 * @param {string} [options.closeButton]
 * @param {boolean} [options.closeDestroy]
 * @param {CSSStyleDeclaration} [options.headerStyle]
 * @param {CSSStyleDeclaration} [options.titleStyle]
 * @param {CSSStyleDeclaration} [options.contentStyle]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {HTMLDialogElement}
 */
export function createModalElement(title, content, options = {}) {
  createModalElement.id = createModalElement.id || 0;

  const {
    container = document.body,
    id = `default-modal-${createModalElement.id++}`,
    classname = "default-modal",
    open = true,
    closeButton = "✕",
    closeDestroy = false,
    headerStyle = {},
    titleStyle = {},
    contentStyle = {},
    style = {},
  } = options;

  const dialog = document.createElement("dialog");
  dialog.id = id;
  dialog.classList.add(classname);
  dialog.open = open;
  Object.assign(dialog.style, style);

  const article = document.createElement("article");

  const header = document.createElement("header");
  header.style.position = "relative";
  Object.assign(header.style, headerStyle);

  if (title instanceof HTMLElement) {
    Object.assign(title.style, titleStyle);
    header.appendChild(title);
  } else {
    const strong = document.createElement("strong");
    strong.innerText = title;
    Object.assign(strong.style, titleStyle);
    header.appendChild(strong);
  }

  if (closeButton) {
    const close = document.createElement("a");
    close.ariaLabel = "Close";
    close.innerText = closeButton;
    close.style.cursor = "pointer";
    close.style.position = "absolute";
    close.style.right = "1em";
    close.style.textDecoration = "none";
    close.style.top = "0.5em";
    if (closeDestroy) {
      close.onclick = () => {
        dialog.close();
        dialog.remove();
      };
    } else {
      close.onclick = () => {
        dialog.close();
      };
    }
    header.appendChild(close);
  }
  article.appendChild(header);

  if (content instanceof HTMLElement) {
    Object.assign(content.style, contentStyle);
    article.appendChild(content);
  } else {
    const section = document.createElement("section");
    section.innerText = content;
    Object.assign(section.style, contentStyle);
    article.appendChild(section);
  }

  dialog.appendChild(article);
  if (container instanceof HTMLElement) {
    container.appendChild(dialog);
  }

  return dialog;
}

/**
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {string} [options.id]
 * @param {string} [options.classname]
 * @param {boolean} [options.noWrapper]
 * @param {CSSStyleDeclaration} [options.wrapperStyle]
 * @param {CSSStyleDeclaration} [options.labelStyle]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {(wrapper?: HTMLElement, label: HTMLLabelElement, progress: HTMLProgressElement)}
 */
export function createProgressBarElement(options = {}) {
  createProgressBarElement.id = createProgressBarElement.id || 0;

  const {
    container = document.body,
    id = `default-progress-bar-${createProgressBarElement.id++}`,
    classname = "default-progress-bar",
    noWrapper = false,
    wrapperStyle = {},
    labelStyle = {},
    style = {},
  } = options;

  const wrapper = document.createElement("article");
  wrapper.classList.add(`${classname}-wrapper`);
  wrapper.style.position = "fixed";
  wrapper.style.top = "0";
  wrapper.style.width = "100%";
  Object.assign(wrapper.style, wrapperStyle);

  const label = document.createElement("label");
  Object.assign(label.style, labelStyle);

  const progress = document.createElement("progress");
  progress.id = id;
  progress.classList.add(classname);
  progress.max = 100;
  Object.assign(progress.style, style);

  if (noWrapper) {
    if (container instanceof HTMLElement) {
      container.appendChild(label);
      container.appendChild(progress);
    }
    return { label, progress };
  }

  wrapper.appendChild(label);
  wrapper.appendChild(progress);
  if (container instanceof HTMLElement) {
    container.appendChild(wrapper);
  }

  return { wrapper, label, progress };
}

/**
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {string} [options.id]
 * @param {string} [options.classname]
 * @param {string} [options.label]
 * @param {CSSStyleDeclaration} [options.parentStyle]
 * @param {CSSStyleDeclaration} [options.labelStyle]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {{parent: HTMLElement, label: HTMLLabelElement, content: HTMLSpanElement}}
 */
export function createDebugElement(options = {}) {
  createDebugElement.id = createDebugElement.id || 0;

  const {
    container = document.body,
    id = `default-debug-${createDebugElement.id++}`,
    classname = "default-debug",
    label = "Debug:",
    parentStyle = {},
    labelStyle = {},
    style = {},
  } = options;

  if (!(createDebugElement.parentElement instanceof HTMLElement)) {
    const parent = document.createElement("article");
    parent.classList.add(`${classname}-parent`);
    parent.style.display = "flex";
    parent.style.padding = "0.5em";
    parent.style.position = "fixed";
    parent.style.right = "0";
    parent.style.top = "0";
    Object.assign(parent.style, parentStyle);

    createDebugElement.parentElement = parent;
    if (container instanceof HTMLElement) {
      container.appendChild(createDebugElement.parentElement);
    }
  }

  const labelElement = document.createElement("label");
  labelElement.id = id;
  labelElement.classList.add(classname);
  labelElement.innerText = label + " ";
  labelElement.style.margin = "0 0.5em";
  Object.assign(labelElement.style, labelStyle);

  const content = document.createElement("span");
  Object.assign(content.style, style);

  labelElement.appendChild(content);
  createDebugElement.parentElement.appendChild(labelElement);

  return { parent: createDebugElement.parentElement, label: labelElement, content };
}

/**
 * @param {{src: string, type: string}[]} sources
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {string} [options.id]
 * @param {string} [options.classname]
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @param {boolean} [options.autoplay]
 * @param {boolean} [options.loop]
 * @param {boolean} [options.muted]
 * @param {boolean} [options.playsInline]
 * @param {boolean} [options.controls]
 * @param {boolean} [options.noWrapper]
 * @param {CSSStyleDeclaration} [options.wrapperStyle]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {{wrapper?: HTMLElement, video: HTMLVideoElement}}
 */
export function createVideoElement(sources, options = {}) {
  createVideoElement.id = createVideoElement.id || 0;

  const {
    container = document.body,
    id = `default-video-${createVideoElement.id++}`,
    classname = "default-video",
    width = 400,
    height = 300,
    autoplay = false,
    loop = true,
    muted = true,
    playsInline = true,
    controls = true,
    noWrapper = false,
    wrapperStyle = {},
    style = {},
  } = options;

  const wrapper = document.createElement("div");
  wrapper.classList.add(`${classname}-wrapper`);
  Object.assign(wrapper.style, wrapperStyle);

  const video = document.createElement("video");
  video.id = id;
  video.classList.add(classname);
  video.width = width;
  video.height = height;
  video.autoplay = autoplay;
  if (autoplay) {
    video.toggleAttribute("autoplay", autoplay);
  }
  video.muted = muted;
  if (muted) {
    video.toggleAttribute("muted", muted);
  }
  video.loop = loop;
  if (loop) {
    video.toggleAttribute("loop", loop);
  }
  video.playsInline = playsInline;
  if (playsInline) {
    video.toggleAttribute("playsinline", playsInline);
    video.toggleAttribute("webkit-playsinline", playsInline);
  }
  video.controls = controls;
  if (controls) {
    video.toggleAttribute("controls", controls);
  }
  video.preload = "auto";
  video.setAttribute("preload", "auto");
  Object.assign(video.style, style);

  for (let i = 0; i < sources.length; i++) {
    const source = document.createElement("source");
    source.type = sources[i].type;
    source.src = sources[i].src;
    video.appendChild(source);
  }

  if (noWrapper) {
    if (container instanceof HTMLElement) {
      container.appendChild(video);
    }
    return { video };
  }

  wrapper.appendChild(video);
  if (container instanceof HTMLElement) {
    container.appendChild(wrapper);
  }

  return { wrapper, video };
}

/**
 * @param {string} src
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {string} [options.id]
 * @param {string} [options.classname]
 * @param {string} [options.label]
 * @param {number} [options.min]
 * @param {number} [options.max]
 * @param {number} [options.step]
 * @param {number} [options.value]
 * @param {boolean} [options.noWrapper]
 * @param {CSSStyleDeclaration} [options.wrapperStyle]
 * @param {CSSStyleDeclaration} [options.valueStyle]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {{wrapper?: HTMLLabelElement, value: HTMLElement, input: HTMLInputElement}}
 */
export function createInputRangeElement(options = {}) {
  createInputRangeElement.id = createInputRangeElement.id || 0;

  const {
    container = document.body,
    id = `default-input-range-${createInputRangeElement.id++}`,
    classname = "default-input-range",
    label = "Range",
    min = "0",
    max = "1",
    step = "0.1",
    value = "0",
    noWrapper = false,
    wrapperStyle = {},
    valueStyle = {},
    style = {},
  } = options;

  const wrapper = document.createElement("label");
  wrapper.classList.add(`${classname}-wrapper`);
  wrapper.innerText = label + " • ";
  Object.assign(wrapper.style, wrapperStyle);

  const valueElement = document.createElement("mark");
  valueElement.innerText = value;
  Object.assign(valueElement.style, valueStyle);

  const input = document.createElement("input");
  input.id = id;
  input.classList.add(classname);
  input.type = "range";
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  Object.assign(input.style, style);
  input.addEventListener("input", (event) => {
    valueElement.innerText = event.target.value;
  });

  if (noWrapper) {
    if (container instanceof HTMLElement) {
      container.appendChild(valueElement);
      container.appendChild(input);
    }
    return { value: valueElement, input };
  }

  wrapper.appendChild(valueElement);
  wrapper.appendChild(input);
  if (container instanceof HTMLElement) {
    container.appendChild(wrapper);
  }

  return { wrapper, value: valueElement, input };
}
