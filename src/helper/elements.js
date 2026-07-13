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
export function createCanvas(options = {}) {
  const {
    container = document.body,
    id = "default-canvas",
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
 * @param {string|HTMLElement} content
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {string} [options.id]
 * @param {string} [options.classname]
 * @param {string} [options.title]
 * @param {boolean} [options.open]
 * @param {boolean} [options.closable]
 * @param {CSSStyleDeclaration} [options.dialogStyle]
 * @param {CSSStyleDeclaration} [options.headerStyle]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {HTMLDialogElement}
 */
export function createModal(content, options = {}) {
  const {
    container = document.body,
    id = "default-modal",
    classname = "default-modal",
    title = "",
    open = true,
    closable = false,
    dialogStyle = {},
    headerStyle = {
      fontSize: "small",
    },
    style = {
      fontSize: "small",
    },
  } = options;

  const dialog = document.createElement("dialog");
  dialog.id = id;
  dialog.classList.add(classname);
  Object.assign(dialog.style, dialogStyle);

  const article = document.createElement("article");

  if (title || closable) {
    const header = document.createElement("header");
    Object.assign(header.style, headerStyle);

    if (title) {
      const strong = document.createElement("strong");
      strong.innerText = title;
      header.appendChild(strong);
    }
    if (closable) {
      const button = document.createElement("a");
      button.ariaLabel = "Close";
      button.innerText = "&times;";
      button.style.cursor = "pointer";
      button.style.float = "right";
      button.style.textDecoration = "none";
      button.onclick = () => {
        dialog.close();
        dialog.remove();
      };
      header.appendChild(button);
    }
    article.appendChild(header);
  }

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

  dialog.open = open;
  return dialog;
}

/**
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {string} [options.id]
 * @param {string} [options.classname]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {(wrapper: HTMLElement, caption: HTMLSpanElement, progress: HTMLProgressElement)}
 */
export function createProgressBar(options = {}) {
  const {
    container = document.body,
    id = "default-progress-bar",
    classname = "default-progress-bar",
    style = {
      fontSize: "small",
      position: "fixed",
      top: "0",
      width: "100%",
    },
  } = options;

  const wrapper = document.createElement("article");
  wrapper.id = id;
  wrapper.classList.add(classname);
  Object.assign(wrapper.style, style);

  const caption = document.createElement("span");
  const progress = document.createElement("progress");
  progress.max = 100;

  wrapper.appendChild(caption);
  wrapper.appendChild(progress);

  if (container instanceof HTMLElement) {
    container.appendChild(wrapper);
  }

  return { wrapper, caption, progress };
}

/**
 * @param {Object} [options]
 * @param {HTMLElement} [options.container]
 * @param {string} [options.id]
 * @param {string} [options.classname]
 * @param {string} [options.label]
 * @param {CSSStyleDeclaration} [options.parentStyle]
 * @param {CSSStyleDeclaration} [options.style]
 * @returns {{outer: HTMLSpanElement, inner: HTMLElement}}
 */
export function addDebugElement(options = {}) {
  const {
    container = document.body,
    id = "default-debug",
    classname = "default-debug",
    label = "Debug:",
    parentStyle = {
      display: "flex",
      position: "fixed",
      right: "0",
      top: "0",
    },
    style = {
      fontSize: "small",
      margin: "0 0.5em",
    },
  } = options;

  if (!(addDebugElement.parentContainer instanceof HTMLElement)) {
    addDebugElement.parentContainer = document.createElement("section");
    addDebugElement.parentContainer.id = id;
    addDebugElement.parentContainer.classList.add(classname);
    Object.assign(addDebugElement.parentContainer.style, parentStyle);

    if (container instanceof HTMLElement) {
      container.appendChild(addDebugElement.parentContainer);
    }
  }

  const outer = document.createElement("span");
  outer.innerText = label + " ";
  Object.assign(outer.style, style);

  const inner = document.createElement("span");
  outer.appendChild(inner);

  addDebugElement.parentContainer.appendChild(outer);

  return { outer, inner };
}
