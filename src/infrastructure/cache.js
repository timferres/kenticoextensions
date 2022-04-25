export function ke_getItemFromCacheList(clientKey) {
  var cacheListJSON = localStorage.getItem(
    'data=cachelist&userid=' + ke_UserID
  );
  var cacheList = JSON.parse(cacheListJSON);
  if (cacheList != null && cacheList.Data != null) {
    for (var i = 0; i < cacheList.Data.length; i++) {
      if (cacheList.Data[i].ClientKey == clientKey) {
        ke_log('item found: ' + clientKey);
        return cacheList.Data[i];
      }
    }
  }

  ke_log('item missing: ' + clientKey);
  return null;
}

export function getRequestCacheItem(queryParams) {
  const key = queryParams.toString();

  return localStorage.getItem(key);
}
