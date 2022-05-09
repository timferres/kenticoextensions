/**
 *
 * @param {string} name
 * @param {string} url
 * @returns {string | null}
 */
export function ke_getQueryStringValue(name, url) {
  if (!url) url = window.location.href;

  if (url.indexOf('&amp;') > 0) {
    url = url.replace('&amp;', '&');
  }

  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) {
    return null;
  }
  if (!results[2]) {
    return '';
  }
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
