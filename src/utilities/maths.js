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
