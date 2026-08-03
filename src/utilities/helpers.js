/**
 * @file
 */

/**
 * @param {string} key
 * @param {any} [fallback]
 * @returns {any}
 */
export function getQueryValue(key, fallback = undefined) {
  if (!(getQueryValue.searchParameters instanceof URLSearchParams)) {
    getQueryValue.searchParameters = new URLSearchParams(location.search);
  }
  return getQueryValue.searchParameters.has(key) ? getQueryValue.searchParameters.get(key) : fallback;
}

/**
 * @param {string} name
 * @param {string} value
 * @param {number} [days]
 */
export function setCookie(name, value, days = 30) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax; Secure`;
}

/**
 * @param {string} name
 * @returns {string}
 */
export function getCookie(name) {
  const cookies = document.cookie.split("; ");
  for (let i = 0; i < cookies.length; i++) {
    const [key, value] = cookies[i].split("=");
    if (decodeURIComponent(key) === name) {
      return decodeURIComponent(value);
    }
  }
  return "";
}
