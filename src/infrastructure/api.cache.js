function ke_getAPIDataAsync(
  queryStringParams,
  refreshData,
  callback,
  returnJSONObject
) {
  var innerCallback = function () {
    ke_getDataAsync(queryStringParams, refreshData, callback, returnJSONObject);
  };
  // By passing ke_getDataAsync as a callback results in the method being called
  // once the local storage cache list is updated. Since a callback is passed
  // to ke_getAPIDataAsync, the innerCallback will in turn call the callback.
  // It is a bit of callback inception, but this is the best solution I can
  // find for the moment. The alternative was to use a while loop with a
  // wait interval until the local storage cache is updated.
  ke_checkLocalStorageCacheList(innerCallback);
}

function ke_postAPIDataAsync(
  queryStringParams,
  refreshData,
  callback,
  returnJSONObject,
  requestBody
) {
  var innerCallback = function () {
    ke_postDataAsync(
      queryStringParams,
      refreshData,
      callback,
      returnJSONObject,
      requestBody
    );
  };
  ke_checkLocalStorageCacheList(innerCallback);
}

function ke_checkLocalStorageCacheList(callback) {
  if (ke_UserID == 0) {
    callback.call(this);
    return;
  }

  const { CacheListRefreshFrequency } = ke_getConfiguration();

  var cacheListRefreshFrequency = CacheListRefreshFrequency * 1000;

  // check if cache list exists in local storage
  var cacheListParams = 'data=cachelist&userid=' + ke_UserID;
  var cacheListJSON = localStorage.getItem(cacheListParams);
  if (cacheListJSON != null) {
    var cacheList = JSON.parse(cacheListJSON);
    // check cache list last update. If more than 10 seconds ago, fetch it again and store in local storage
    var currentDateTime = new Date();
    var lastUpdatedDateTime = new Date(cacheList.CacheDateTimeUTC);
    var msDifference = currentDateTime - lastUpdatedDateTime;
    if (msDifference > cacheListRefreshFrequency) {
      // fetch the latest cache list and store in local storage (no callback required)
      ke_log(
        'refresh cache list (' +
          Math.floor(msDifference / 1000) +
          ' seconds since last update)'
      );
      ke_getDataAsync(cacheListParams, true, callback, true);
      return;
    } else {
      ke_log('cache list ok');
    }
  } else {
    ke_log('request cache list');
    ke_getDataAsync(cacheListParams, false, callback, true);
    return;
  }

  callback.call(this);
}

function ke_getDataAsync(
  queryStringParams,
  refreshServerCache,
  callback,
  returnJSONObject
) {
  const { apiURL } = ke_getConfiguration();

  var URL = apiURL + '?' + queryStringParams;
  var clientKey = queryStringParams;

  var cachedDataJSON = localStorage.getItem(clientKey);
  if (
    refreshServerCache == false &&
    cachedDataJSON != null &&
    cachedDataJSON != ''
  ) {
    var cachedData = JSON.parse(cachedDataJSON);
    var cacheStatus = ke_getItemFromCacheList(clientKey);
    if (cacheStatus != null && cacheStatus.Hash == cachedData.Hash) {
      //return data from local storage
      if (returnJSONObject == true) {
        callback.call(this, cachedData.Data);
      } else {
        callback.call(this, cachedData.Data);
      }
      return;
    }
  }

  if (refreshServerCache)
    URL += URL.indexOf('?') !== -1 ? '&refreshdata=true' : '?refreshdata=true';

  var xhrReq = new XMLHttpRequest();
  xhrReq.callback = ke_xhrSuccess;
  xhrReq.arguments = Array.prototype.slice.call(arguments, 2);
  xhrReq.onload = ke_xhrSuccess;

  xhrReq.open('GET', URL, true);
  ke_log(queryStringParams);
  xhrReq.send(null);
}

function ke_postDataAsync(
  queryStringParams,
  refreshServerCache,
  callback,
  returnJSONObject,
  requestBody
) {
  const { apiURL } = ke_getConfiguration();

  var URL = apiURL + '?' + queryStringParams;
  var clientKey = queryStringParams;

  var cachedDataJSON = localStorage.getItem(clientKey);
  if (
    refreshServerCache == false &&
    cachedDataJSON != null &&
    cachedDataJSON != ''
  ) {
    var cachedData = JSON.parse(cachedDataJSON);
    var cacheStatus = ke_getItemFromCacheList(clientKey);
    if (cacheStatus != null && cacheStatus.Hash == cachedData.Hash) {
      //return data from local storage
      if (returnJSONObject == true) {
        callback.call(this, cachedData.Data);
      } else {
        callback.call(this, cachedData.Data);
      }
      return;
    }
  }

  if (refreshServerCache)
    URL += URL.indexOf('?') !== -1 ? '&refreshdata=true' : '?refreshdata=true';

  var xhrReq = new XMLHttpRequest();
  xhrReq.callback = ke_xhrSuccess;
  xhrReq.arguments = Array.prototype.slice.call(arguments, 2);
  xhrReq.onload = ke_xhrSuccess;

  xhrReq.open('POST', URL, true);
  ke_log(queryStringParams);
  ke_log(requestBody);
  xhrReq.send(requestBody);
}

function ke_xhrSuccess() {
  var callback = this.arguments[0];
  var returnJSONObject = this.arguments[1];

  if (this.status !== 200 || this.responseText === '') {
    var message =
      this.responseText !== ''
        ? this.responseText
        : 'API endpoint returned status code ' + this.status;
    var displayMessage =
      "<br><span class='ke-ko-error-message'>" + message + '</span>';
    ke_ko_commandComplete(displayMessage);
    return;
  }

  var requestURL = this.responseURL
    .replace('&refreshdata=true', '')
    .replace('?refreshdata=true', '');
  var clientKey = requestURL.substring(requestURL.indexOf('?') + 1);

  var data = getQueryStringValue('data', this.responseURL);
  if (data !== 'executequery') {
    localStorage.setItem(clientKey, this.responseText);
  }

  if (data == 'cachelist' || data == 'executequery') {
    if (returnJSONObject == true) {
      var returnObject = JSON.parse(this.responseText);
      callback.call(this, returnObject);
    } else {
      callback.call(this, this.responseText);
    }
  } else {
    var jsonObject = JSON.parse(this.responseText);
    if (returnJSONObject == true) {
      callback.call(this, jsonObject.Data);
    } else {
      callback.call(this, jsonObject.Data);
    }
  }
}
