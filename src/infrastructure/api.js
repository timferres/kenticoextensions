import { ke_getConfiguration } from './config';

export function get(queryParams, refreshData) {
  const { apiURL } = ke_getConfiguration();

  var params = new URLSearchParams();

  for (const key in queryParams) {
    if (Object.hasOwnProperty.call(queryParams, key)) {
      params.append(key, queryParams[key]);
    }
  }

  if (refreshData) {
    params.append('refreshdata', true);
  }

  const requestURL = Array.from(params.entries()).length
    ? `${apiURL}?${params.toString()}`
    : apiURL;

  return fetch(requestURL, { method: 'GET' })
    .then((resp) => resp.json())
    .then((resp) => resp.Data);
}

export function post(queryParams, payload, refreshData) {
  const { apiURL } = ke_getConfiguration();

  var params = new URLSearchParams();

  for (const key in queryParams) {
    if (Object.hasOwnProperty.call(object, key)) {
      params.append(key, object[key]);
    }
  }

  if (refreshData) {
    params.append('refreshdata', true);
  }

  const requestURL = params.keys.length
    ? `${apiURL}?${params.toString()}`
    : apiURL;

  return fetch(requestURL, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
    .then((resp) => resp.json())
    .then((resp) => resp.Data);
}
