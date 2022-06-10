export function ke_getISODateTimeString(date, format) {
  var cdt = new Date(date);
  var hours = cdt.getHours();
  var ampm = cdt.getHours() >= 12 ? 'PM' : 'AM';
  if ((format = '12')) {
    var hours = hours % 12;
    hours = hours ? hours : 12;
  }
  var cdts =
    cdt.getFullYear() +
    '-' +
    ('0' + (cdt.getMonth() + 1)).slice(-2) +
    '-' +
    ('0' + cdt.getDate()).slice(-2) +
    ' ' +
    ('0' + hours).slice(-2) +
    ':' +
    ('0' + cdt.getMinutes()).slice(-2) +
    ':' +
    ('0' + cdt.getSeconds()).slice(-2);
  if ((format = '12')) {
    cdts += ' ' + ampm;
  }
  return cdts;
}

export function ke_getCurrentDateTimeString() {
  var cdt = new Date();
  var cdts =
    cdt.getUTCFullYear() +
    '-' +
    ('0' + (cdt.getUTCMonth() + 1)).slice(-2) +
    '-' +
    ('0' + cdt.getUTCDate()).slice(-2) +
    ' ' +
    ('0' + cdt.getUTCHours()).slice(-2) +
    ':' +
    ('0' + cdt.getUTCMinutes()).slice(-2) +
    ':' +
    ('0' + cdt.getUTCSeconds()).slice(-2);
  return cdts;
}

export function ke_formatBytes(bytes) {
  if (bytes >= 1000000000) {
    bytes = (bytes / 1000000000).toFixed(2) + ' GB';
  } else if (bytes >= 1000000) {
    bytes = (bytes / 1000000).toFixed(2) + ' MB';
  } else if (bytes >= 1000) {
    bytes = (bytes / 1000).toFixed(0) + ' KB';
  } else if (bytes > 1) {
    bytes = bytes + ' bytes';
  } else if (bytes == 1) {
    bytes = bytes + ' byte';
  } else {
    bytes = '0 byte';
  }
  return bytes;
}
