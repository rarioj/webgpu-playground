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
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {HTMLCanvasElement}
 */
export function createCanvasElement(options = {}) {
  createCanvasElement.id = createCanvasElement.id || 0;

  const {
    container = document.body,
    id = `default-canvas-${createCanvasElement.id++}`,
    classname = "default-canvas",
    width = window.innerWidth,
    height = window.innerHeight,
    style = {},
  } = options;

  const canvas = document.createElement("canvas");
  canvas.id = id;
  canvas.classList.add(classname);
  canvas.width = width;
  canvas.height = height;
  Object.assign(canvas.style, style);
  if (container instanceof HTMLElement) {
    container.appendChild(canvas);
  }

  return canvas;
}

/**
 * @param {string|HTMLElement} title
 * @param {string|HTMLElement} content
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {string} [options.id]
 * @param {string} [options.classname]
 * @param {boolean} [options.open]
 * @param {boolean} [options.closable]
 * @param {CSSStyleDeclaration} [options.dialogStyle]
 * @param {CSSStyleDeclaration} [options.headerStyle]
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
    closable = "❎",
    dialogStyle = {},
    headerStyle = {},
    style = {},
  } = options;

  const dialog = document.createElement("dialog");
  dialog.id = id;
  dialog.classList.add(classname);
  dialog.open = open;
  Object.assign(dialog.style, dialogStyle);

  const article = document.createElement("article");

  const header = document.createElement("header");
  header.style.position = "relative";
  Object.assign(header.style, headerStyle);

  if (title instanceof HTMLElement) {
    header.appendChild(title);
  } else {
    const strong = document.createElement("strong");
    strong.innerText = title;
    header.appendChild(strong);
  }

  if (closable) {
    const closeElement = document.createElement("a");
    closeElement.ariaLabel = "Close";
    closeElement.innerText = closable;
    closeElement.style.cursor = "pointer";
    closeElement.style.position = "absolute";
    closeElement.style.right = "1em";
    closeElement.style.textDecoration = "none";
    closeElement.style.top = "0.5em";
    closeElement.onclick = () => {
      dialog.close();
      dialog.remove();
    };
    header.appendChild(closeElement);
  }
  article.appendChild(header);

  if (content instanceof HTMLElement) {
    article.appendChild(content);
  } else {
    const section = document.createElement("section");
    section.innerText = content;
    Object.assign(section.style, style);
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
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {(wrapper: HTMLElement, status: HTMLSpanElement, progress: HTMLProgressElement)}
 */
export function createProgressBarElement(options = {}) {
  createProgressBarElement.id = createProgressBarElement.id || 0;

  const { container = document.body, id = `default-progress-bar-${createProgressBarElement.id++}`, classname = "default-progress-bar", style = {} } = options;

  const wrapper = document.createElement("article");
  wrapper.id = id;
  wrapper.classList.add(classname);
  wrapper.style.position = "fixed";
  wrapper.style.top = "0";
  wrapper.style.width = "100%";
  Object.assign(wrapper.style, style);

  const status = document.createElement("span");
  const progress = document.createElement("progress");
  progress.max = 100;

  wrapper.appendChild(status);
  wrapper.appendChild(progress);

  if (container instanceof HTMLElement) {
    container.appendChild(wrapper);
  }

  return { wrapper, status, progress };
}

/**
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {string} [options.id]
 * @param {string} [options.classname]
 * @param {string} [options.label]
 * @param {CSSStyleDeclaration} [options.parentStyle]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {{wrapper: HTMLElement, label: HTMLSpanElement, content: HTMLSpanElement}}
 */
export function createDebugElement(options = {}) {
  createDebugElement.id = createDebugElement.id || 0;

  const {
    container = document.body,
    id = `default-debug-${createDebugElement.id++}`,
    classname = "default-debug",
    label = "Debug:",
    parentStyle = {},
    style = {},
  } = options;

  if (!(createDebugElement.wrapperElement instanceof HTMLElement)) {
    const wrapper = document.createElement("section");
    wrapper.id = id;
    wrapper.classList.add(classname);
    wrapper.style.display = "flex";
    wrapper.style.fontSize = "small";
    wrapper.style.position = "fixed";
    wrapper.style.right = "0";
    wrapper.style.top = "0";
    Object.assign(wrapper.style, parentStyle);

    createDebugElement.wrapperElement = wrapper;
    if (container instanceof HTMLElement) {
      container.appendChild(createDebugElement.wrapperElement);
    }
  }

  const caption = document.createElement("span");
  caption.innerText = label + " ";
  caption.style.margin = "0 0.5em";
  Object.assign(caption.style, style);

  const content = document.createElement("span");
  caption.appendChild(content);

  createDebugElement.wrapperElement.appendChild(caption);

  return { wrapper: createDebugElement.wrapperElement, caption, content };
}
