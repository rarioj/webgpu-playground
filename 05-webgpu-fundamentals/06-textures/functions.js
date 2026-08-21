/**
 * @file
 */

/**
 * @param {Uint8Array} data
 * @param {number} width
 * @param {number} height
 * @returns {{data: Uint8Array, width: number, height: number}}
 */
function createNextLevelMipmap(data, width, height) {
  const dstWidth = Math.max(1, (width / 2) | 0);
  const dstHeight = Math.max(1, (height / 2) | 0);
  const dst = new Uint8Array(dstWidth * dstHeight * 4);
  const scaleX = width / dstWidth;
  const scaleY = height / dstHeight;
  for (let y = 0; y < dstHeight; ++y) {
    const av = (y + 0.5) * scaleY - 0.5;
    const ty = Math.max(0, Math.min(height - 2, av | 0));
    const t2 = av - ty;
    const rowTop = ty * width * 4;
    const rowBot = rowTop + width * 4;
    const dstRowOffset = y * dstWidth * 4;
    for (let x = 0; x < dstWidth; ++x) {
      const au = (x + 0.5) * scaleX - 0.5;
      const tx = Math.max(0, Math.min(width - 2, au | 0));
      const t1 = au - tx;
      const idxTL = rowTop + tx * 4;
      const idxBL = rowBot + tx * 4;
      const dstIdx = dstRowOffset + x * 4;
      for (let c = 0; c < 4; ++c) {
        const tl = data[idxTL + c];
        const tr = data[idxTL + 4 + c];
        const bl = data[idxBL + c];
        const br = data[idxBL + 4 + c];
        const top = tl + (tr - tl) * t1;
        const bot = bl + (br - bl) * t1;
        dst[dstIdx + c] = top + (bot - top) * t2;
      }
    }
  }
  return { data: dst, width: dstWidth, height: dstHeight };
}

/**
 * @param {Uint8Array} data
 * @param {number} width
 * @param {string} [group]
 * @returns {{group: string, data: Uint8Array, width: number, height: number}[]}
 */
export function generateMipmaps(data, width, group = "__default__") {
  const height = data.length / 4 / width;
  const mipmaps = [];

  let mipmap = { data, width, height };
  mipmap.group = group;
  mipmaps.push(mipmap);

  while (mipmap.width > 1 || mipmap.height > 1) {
    mipmap = createNextLevelMipmap(mipmap.data, mipmap.width, mipmap.height);
    mipmap.group = group;
    mipmaps.push(mipmap);
  }

  return mipmaps;
}
