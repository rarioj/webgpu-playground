/**
 * @file
 */

/**
 * @param {number} [min]
 * @param {number} [max]
 * @param {boolean} [integer]
 * @returns {number}
 */
export function getRandom(min = 0.0, max = 1.0, integer = false) {
  if (integer) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  return Math.random() * (max - min) + min;
}

/**
 * @param {number} degree
 * @returns {number}
 */
export function degreeToRadian(degree) {
  return degree * (Math.PI / 180);
}

/**
 * @param {number} radian
 * @returns {number}
 */
export function radianToDegree(radian) {
  return radian * (180 / Math.PI);
}

/**
 * @param {number} value
 * @param {number} [decimalPlace]
 * @param {boolean} [fixed]
 * @returns {number}
 */
export function roundToDecimal(value, decimalPlace = 2, fixed = false) {
  if (fixed) {
    return +value.toFixed(decimalPlace);
  }
  const multiplier = Math.pow(10, decimalPlace);
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

/**
 * @param {Float32Array} input
 * @param {Float32Array} output
 * @returns {Float32Array}
 */
export function fastRigidInverse(input, output) {
  const target = output;

  const m0 = input[0];
  const m1 = input[1];
  const m2 = input[2];
  const m4 = input[4];
  const m5 = input[5];
  const m6 = input[6];
  const m8 = input[8];
  const m9 = input[9];
  const m10 = input[10];

  target[0] = m0;
  target[1] = m4;
  target[2] = m8;
  target[3] = 0;
  target[4] = m1;
  target[5] = m5;
  target[6] = m9;
  target[7] = 0;
  target[8] = m2;
  target[9] = m6;
  target[10] = m10;
  target[11] = 0;

  const tx = input[12];
  const ty = input[13];
  const tz = input[14];

  target[12] = -(m0 * tx + m1 * ty + m2 * tz);
  target[13] = -(m4 * tx + m5 * ty + m6 * tz);
  target[14] = -(m8 * tx + m9 * ty + m10 * tz);
  target[15] = 1; // no scaling

  return target;
}
