//# sourceURL=browsertools://kenticoextensions/kenticoextensions.js

/*
GLOBAL VARIABLES
*/
var ke_CMSSiteURL = window.location.origin + '/';
var ke_CMSAdminURL = ke_CMSSiteURL + 'admin/cmsadministration.aspx';
var ke_PublicSiteURL = ke_CMSSiteURL.replace('cms', 'site'); // This is client specific!
var ke_APIURL = ke_CMSSiteURL + 'kenticoextensions/api.ashx';

var ke_Config = null;
var ke_UserID = 0;
var ke_UserGUID = '00000000-0000-0000-0000-000000000000';
var ke_UserName = '';
var ke_GlobalAdmin = false;
var ke_PreferredUICultureCode = 'en-AU';
var ke_init_complete = false;

/*
Kentico Extensions Common
Description: Common methods required by multiple Kentico Extensions
*/
var ke_initalised = false;
ke_init();

function ke_init() {
  if (ke_initalised === true) return;
  ke_initalised = true;
  ke_init_complete = new Event('ke_init_complete');
  if (window.location.href.indexOf('/CMSPages/logon.aspx') != -1) {
    // clear local storage to avoid using cached data for another user
    localStorage.clear();
    // don't do anything else since it is the login page
    return;
  }
  ke_getSession();
}

function ke_getSession() {
  ke_log('getting session information');
  // To initalise Kentico Extensions, the current user id is required
  // The user id can be determined by fetching the current session information from the server
  // However, if the session data has already been fetched and stored in local storage
  // Note: if the user has logged out and logged in again
  // they would have been taken to the login page
  // When the login page is detected, local storage is cleared
  // this prevents the wrong user session being read from local storage
  ke_getAPIDataAsync('data=session', false, ke_getSessionCallback, true);
}

function ke_getSessionCallback(sessionData) {
  ke_UserID = sessionData.UserID;
  ke_UserGUID = sessionData.UserGUID;
  ke_UserName = sessionData.UserName;
  ke_GlobalAdmin = sessionData.GlobalAdmin;
  ke_PreferredUICultureCode = sessionData.PreferredUICultureCode;

  var qsParams = 'data=configuration';
  ke_getAPIDataAsync(qsParams, false, ke_initCallback, true);
}

function ke_initCallback(keConfig) {
  ke_Config = keConfig;
  if (
    ke_Config.Enabled &&
    ke_checkUserEnabled() &&
    ke_checkUserDisabled() === false
  ) {
    // initalise all the extensions
    document.dispatchEvent(ke_init_complete);
  }
}

function ke_checkUserEnabled() {
  if (
    ke_Config === null ||
    ke_Config.EnabledUserNames === null ||
    ke_Config.EnabledUserNames.length === 0 ||
    ke_Config.EnabledUserNames.indexOf(ke_UserName) !== -1
  )
    return true;

  return false;
}

function ke_checkUserDisabled() {
  if (
    ke_Config === null ||
    ke_Config.DisabledUserNames === null ||
    ke_Config.DisabledUserNames.length === 0 ||
    ke_Config.DisabledUserNames.indexOf(ke_UserName) === -1
  )
    return false;

  return true;
}

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

  var cacheListRefreshFrequency = 10000; // default to 10 seconds
  if (ke_Config != undefined) {
    cacheListRefreshFrequency = ke_Config.CacheListRefreshFrequency * 1000;
  }

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

function ke_getItemFromCacheList(clientKey) {
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

function ke_wait_for_testing_only(ms) {
  var startDateTime = new Date();
  var msDiff = 0;
  while (msDiff <= ms) {
    currentDateTime = new Date();
    ms = currentDateTime - startDateTime;
  }
}

function ke_getDataAsync(
  queryStringParams,
  refreshServerCache,
  callback,
  returnJSONObject
) {
  var URL = ke_APIURL + '?' + queryStringParams;
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
  xhrReq.onerror = ke_xhrError;
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
  var URL = ke_APIURL + '?' + queryStringParams;
  var clientKey =
    queryStringParams + '&requestbodyhash=' + ke_hash(requestBody);

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
  xhrReq.onerror = ke_xhrError;
  xhrReq.open('POST', URL, true);
  ke_log(queryStringParams);
  ke_log(requestBody);
  xhrReq.send(requestBody);
}

const ke_hash = function (str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

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
    ke_ko_commandComplete(displayMessage); //TODO: throw exception instead of displaying message > throw message;
    return;
  }

  var requestURL = this.responseURL
    .replace('&refreshdata=true', '')
    .replace('?refreshdata=true', '');
  var clientKey = requestURL.substring(requestURL.indexOf('?') + 1);

  var data = ke_getQueryStringValue('data', this.responseURL);
  if (data !== 'executequery') ke_setLocalStorage(clientKey, this.responseText);

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

function ke_setLocalStorage(clientKey, data) {
  ke_log(clientKey);
  // check if data is too big for local storage
  localStorage.setItem(clientKey, data);
}

function ke_xhrError() {
  ke_log('An error occured when attempting to make a XMLHttpRequest');
}

function ke_getSettingsCategory(settingsCategory, categoryName) {
  if (settingsCategory.CategoryName == categoryName) {
    return settingsCategory;
  }
  if (settingsCategory.Categories.length > 0) {
    var result;
    for (var i = 0; i < settingsCategory.Categories.length; i++) {
      result = arguments.callee(settingsCategory.Categories[i], categoryName);
      if (result != undefined) {
        return result;
      }
    }
  }
}

function ke_getSettingsValue(settingsCategory, keyName, returnJSONObject) {
  for (var i = 0; i < settingsCategory.Keys.length; i++) {
    if (settingsCategory.Keys[i].KeyName === keyName) {
      if (returnJSONObject == false) {
        return settingsCategory.Keys[i].KeyValue;
      } else {
        return JSON.parse(settingsCategory.Keys[i].KeyValue);
      }
    }
  }

  var result;
  for (var i = 0; i < settingsCategory.Categories.length; i++) {
    result = arguments.callee(
      settingsCategory.Categories[i],
      keyName,
      returnJSONObject
    );
    if (result != undefined) {
      return result;
    }
  }
}

function ke_getExtensionConfiguration(code) {
  if (ke_Config == undefined) {
    return;
  }

  for (var i = 0; i < ke_Config.Extensions.length; i++) {
    if (ke_Config.Extensions[i].Code == code) {
      return ke_Config.Extensions[i];
    }
  }
}

function ke_getQueryStringValue(name, url) {
  if (!url) url = window.location.href;

  if (url.indexOf('&amp;') > 0) {
    url = url.replace('&amp;', '&');
  }

  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function ke_formatBytes(bytes) {
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

function ke_log(message, outputpathname) {
  if (outputpathname == undefined) {
    outputpathname = false;
  }
  var callingFunction = arguments.callee.caller.name;

  // if the calling function matches ke_xx_ or ke_xxx_
  if (callingFunction.match(/^ke_.{2,3}_/) != null) {
    var extCodeStart = callingFunction.indexOf('_') + 1;
    var extCodeEnd = callingFunction.substr(extCodeStart).indexOf('_');
    var extCode = callingFunction.substr(extCodeStart, extCodeEnd);
    var extConfig = ke_getExtensionConfiguration(extCode);
    if (extConfig != undefined && extConfig.ConsoleLogging == false) {
      return;
    }
  }

  if (
    callingFunction.startsWith('ke_') &&
    ke_Config != null &&
    ke_Config.ConsoleLogging == false
  ) {
    return;
  }

  if (callingFunction == '') {
    callingFunction = 'ke_anonymous';
  }

  var currentDate = new Date();
  var dateString = currentDate.toISOString().substr(0, 19).replace('T', ' ');
  var output = dateString + ' ' + callingFunction + ': ' + message;
  if (outputpathname) {
    output += '\n' + window.location.pathname;
  }
  console.log(output);
}

function ke_getCurrentDateTimeString() {
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

function ke_getISODateTimeString(date, format) {
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

function ke_getCookie(name) {
  var value = '; ' + document.cookie;
  var parts = value.split('; ' + name + '=');
  if (parts.length == 2) return parts.pop().split(';').shift();
}

function ke_getHash(inputString) {
  return inputString.split('').reduce(function (a, b) {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
}

/*
Extension: Environment Bar (eb)
Description: Adds a coloured bar to indicate the current environment
*/
var kb_eb_initalised = false;
document.addEventListener('ke_init_complete', ke_eb_init, false);

function ke_eb_init() {
  if (kb_eb_initalised == true) return;

  var masterContainer = document.getElementsByClassName('CMSDeskContent')[0];
  if (masterContainer == undefined) {
    return;
  }

  ke_log('init start');

  var extConfig = ke_getExtensionConfiguration('eb');
  if (extConfig == undefined) {
    ke_log('Configuration not found.');
    return;
  }

  if (extConfig.Enabled == false) {
    return;
  }

  if (extConfig.Config == null) {
    ke_log('Configuration JSON not found.');
    return;
  }

  var envConfig = ke_eb_getEnvConfig(extConfig);
  if (envConfig == undefined) {
    ke_log('Environment Bar configuration not found.');
    return;
  }

  var envbar = document.createElement('div');
  envbar.id = 'ke-eb';
  envbar.className = 'ke-eb fullwidth';
  envbar.style.backgroundColor = envConfig.Color;
  masterContainer.parentNode.insertBefore(envbar, masterContainer);

  var envbarlabel = document.createElement('div');
  envbarlabel.id = 'ke-eb label';
  envbarlabel.className = 'ke-eb label';
  envbarlabel.style.backgroundColor = envConfig.Color;
  envbarlabel.innerHTML = '<span>' + envConfig.Label + '</span>';
  masterContainer.parentNode.insertBefore(envbarlabel, masterContainer);

  ke_log('init complete');
  kb_eb_initalised = true;
}

function ke_eb_getEnvConfig(ebConfig) {
  var envConfig = ebConfig.Config;
  var currentURL = window.location.hostname;
  for (var i = 0; i < envConfig.Environments.length; i++) {
    var configURL = envConfig.Environments[i].URL;
    if (configURL == currentURL) {
      return envConfig.Environments[i];
    }

    // starts with wildcard
    if (
      configURL.length > 1 &&
      !configURL.startsWith('*') &&
      configURL.endsWith('*') &&
      currentURL.startsWith(configURL.substr(0, configURL.length - 1)) === true
    ) {
      return envConfig.Environments[i];
    }

    // ends with wildcard
    if (
      configURL.length > 1 &&
      configURL.startsWith('*') &&
      !configURL.endsWith('*') &&
      currentURL.endsWith(configURL.substr(1)) === true
    ) {
      return envConfig.Environments[i];
    }

    // contains wildcard
    if (
      configURL.length > 2 &&
      configURL.startsWith('*') &&
      configURL.endsWith('*') &&
      currentURL.indexOf(configURL.substr(1, configURL.length - 2)) !== -1
    ) {
      return envConfig.Environments[i];
    }
  }
}

/*
Extension: Shortcuts Bar (sb)
Description: Adds a navigation bar to the top of the CMS containing links to common functionality
*/
var ke_sb_initalised = false;
document.addEventListener('ke_init_complete', ke_sb_init, false);

function ke_sb_init() {
  if (ke_sb_initalised === true) return;

  ke_sb_observeDashboardUpdates();

  var masterContainer = document.getElementsByClassName('CMSDeskContent')[0];
  if (masterContainer === undefined) {
    return;
  }

  ke_log('shortcuts bar initalising');

  var extConfig = ke_getExtensionConfiguration('sb');
  if (extConfig == undefined) {
    ke_log('configuration not found');
    return;
  }

  if (extConfig.Enabled == false) {
    return;
  }

  window.addEventListener('storage', ke_sb_localStorageCheck);
  ke_sb_load(false);

  ke_sb_initalised = true;
}

function ke_sb_observeDashboardUpdates() {
  // if the current window is the kentico dashboard
  if (
    window.location.href.indexOf(
      '/CMSModules/ApplicationDashboard/ApplicationDashboard.aspx'
    ) != -1
  ) {
    // observe changes to the dashboard page
    // since the dashboard is built dynamically, when the edit button is added, bind an event to it
    var buttonEventBound = false;
    var mutationObserver = new MutationObserver(function (mutations) {
      if (buttonEventBound) return;
      mutations.forEach(function (mutation) {
        if (buttonEventBound) return;
        var editButton = document.getElementsByClassName(
          'btn btn-edit-mode btn-default icon-only'
        )[0];
        if (editButton !== undefined) {
          editButton.addEventListener(
            'click',
            function () {
              // when the button is clicked after editing the dashboard update the shortcuts bar
              if (this.className.endsWith('active') == false) {
                // the shortcut bar will update whenever the following local storage item changes
                // this will cause all shortcut bars accross all windows to update
                ke_log('updating shortcuts bar');
                var cdts = ke_getCurrentDateTimeString();
                localStorage.setItem(
                  'kenticoextensions-shortcutsbar-lastupdated',
                  cdts
                );
              }
            },
            false
          );
          buttonEventBound = true;
        }
      });
    });

    var dashboardContainer = document.getElementsByTagName('body')[0];
    mutationObserver.observe(dashboardContainer, {
      childList: true,
      subtree: true,
    });
  }
}

function ke_sb_localStorageCheck(e) {
  if (e.key == 'kenticoextensions-shortcutsbar-lastupdated') {
    ke_sb_refresh(false);
  }
}

function ke_sb_load(refreshData) {
  var qsParams = 'data=shortcutbaritems&userid=' + ke_UserID;
  ke_getAPIDataAsync(qsParams, refreshData, ke_sb_loadCallback, true);
}

function ke_sb_loadCallback(shortcutBarItems) {
  var masterContainer = document.getElementsByClassName('CMSDeskContent')[0];
  if (masterContainer === undefined) {
    return;
  }

  var kenavbar = document.createElement('div');
  kenavbar.id = 'kentico-extensions-nav-bar';
  kenavbar.className = 'kentico-extensions-nav-bar';
  kenavbar.style.backgroundColor = '#ffffff';

  var kenavbarlabel = document.createElement('div');
  kenavbarlabel.id = 'kentico-extensions-nav-bar-label';
  kenavbarlabel.className = 'kentico-extensions-nav-bar-label';
  kenavbarlabel.style.display = 'none';

  var kenavbarinnerlabel = document.createElement('div');
  kenavbarinnerlabel.id = 'kentico-extensions-nav-bar-inner-label';
  kenavbarinnerlabel.className = 'kentico-extensions-nav-bar-inner-label';
  kenavbarlabel.appendChild(kenavbarinnerlabel);

  var hideShowLink = document.createElement('a');
  hideShowLink.id = 'kentico-extensions-nav-bar-hideshow';
  hideShowLink.className = 'kentico-extensions-nav-bar-hideshow';
  hideShowLink.title = 'Hide Shortcuts Bar';
  hideShowLink.onclick = ke_sb_hideShow;
  var hideShowIcon = document.createElement('i');
  hideShowIcon.className =
    'icon-chevron-right cms-nav-icon-medium icon-hideshow';
  hideShowLink.appendChild(hideShowIcon);

  var menuLink = document.createElement('a');
  menuLink.id = 'kentico-extensions-nav-bar-menu';
  menuLink.className = 'kentico-extensions-nav-bar-menu';
  menuLink.title = 'Menu';
  menuLink.onmouseenter = ke_sb_showMenu;
  menuLink.onmouseleave = ke_sb_hideMenu;
  var menuIcon = document.createElement('i');
  menuIcon.className = 'icon-menu cms-nav-icon-medium';
  menuLink.appendChild(menuIcon);

  var menuContent = document.createElement('div');
  menuContent.id = 'kentico-extensions-nav-bar-menu-content';
  menuContent.className = 'kentico-extensions-nav-bar-menu-content';
  menuContent.onmouseenter = ke_sb_showMenu;
  menuContent.onmouseleave = ke_sb_hideMenu;

  var configItem = document.createElement('a');
  configItem.id = 'kentico-extensions-nav-bar-config';
  configItem.className = 'kentico-extensions-nav-bar-config';
  configItem.innerHTML = 'Config';
  configItem.href = '/kenticoextensions/config.aspx';
  configItem.target = '_blank';
  menuContent.appendChild(configItem);

  var konsoleItem = document.createElement('a');
  konsoleItem.id = 'kentico-extensions-nav-bar-konsole';
  konsoleItem.className = 'kentico-extensions-nav-bar-konsole';
  konsoleItem.innerHTML = 'Konsole';
  konsoleItem.href = '#';
  konsoleItem.addEventListener(
    'click',
    function () {
      ke_ko_showHide();
    },
    false
  );
  menuContent.appendChild(konsoleItem);

  var konsoleTabItem = document.createElement('a');
  konsoleTabItem.id = 'kentico-extensions-nav-bar-konsole-tab';
  konsoleTabItem.className = 'kentico-extensions-nav-bar-konsole-tab';
  konsoleTabItem.innerHTML = 'Konsole Tab';
  konsoleTabItem.href = '/kenticoextensions/konsole.aspx';
  konsoleTabItem.target = '_blank';
  menuContent.appendChild(konsoleTabItem);

  var refreshItem = document.createElement('a');
  refreshItem.id = 'kentico-extensions-nav-bar-refresh';
  refreshItem.className = 'kentico-extensions-nav-bar-refresh';
  refreshItem.innerHTML = 'Refresh Nav Bar';
  refreshItem.href = '#';
  refreshItem.addEventListener(
    'click',
    function () {
      ke_sb_refresh(true);
    },
    false
  );
  menuContent.appendChild(refreshItem);

  var navBarLine = document.createElement('div');
  navBarLine.className = 'kentico-extensions-nav-bar-line';
  menuContent.appendChild(navBarLine);

  var staticResourcesVersionsItem = document.createElement('a');
  staticResourcesVersionsItem.id = 'kentico-extensions-nav-bar-staticresources';
  staticResourcesVersionsItem.className =
    'kentico-extensions-nav-bar-staticresources';
  staticResourcesVersionsItem.innerHTML = 'Static Resources';
  staticResourcesVersionsItem.href =
    window.location.protocol +
    '//' +
    window.location.hostname.replace('cms', 'site') +
    '/api/staticresources/remote/versions';
  staticResourcesVersionsItem.target = '_blank';
  menuContent.appendChild(staticResourcesVersionsItem);

  var liveSiteItem = document.createElement('a');
  liveSiteItem.id = 'kentico-extensions-nav-bar-livesite';
  liveSiteItem.className = 'kentico-extensions-nav-bar-livesite';
  liveSiteItem.innerHTML = 'Live Site';
  liveSiteItem.href =
    window.location.protocol +
    '//' +
    window.location.hostname.replace('cms', 'site');
  liveSiteItem.target = '_blank';
  menuContent.appendChild(liveSiteItem);

  //var clearCacheItem = document.createElement('a');
  //clearCacheItem.id = "kentico-extensions-nav-bar-clearcache";
  //clearCacheItem.className = "kentico-extensions-nav-bar-clearcache";
  //clearCacheItem.innerHTML = "Clear All Cache";
  //clearCacheItem.href = window.location.protocol + "//" + window.location.hostname.replace("cms", "site") + "/api/cache/items/clear";
  //clearCacheItem.target = "_blank";
  //menuContent.appendChild(clearCacheItem);

  if (shortcutBarItems.length > 0) {
    var shortcutBarElements = ke_sb_build(shortcutBarItems);
    kenavbar.appendChild(shortcutBarElements);
    kenavbar.appendChild(menuLink);
    kenavbar.appendChild(hideShowLink);
    var totalItems = kenavbar.getElementsByTagName('a').length;
    kenavbar.appendChild(menuContent);
    // Need to add 3 to allow for the refresh, hide/show and menu buttons
    kenavbar.style.width = totalItems * 36 + 'px';
    masterContainer.parentNode.insertBefore(kenavbar, masterContainer);

    kenavbarlabel.style.width = kenavbar.style.width;
    masterContainer.parentNode.insertBefore(kenavbarlabel, masterContainer);
  } else {
    var messageDiv = document.createElement('div');
    messageDiv.id = 'kentico-extensions-nav-bar-message';
    messageDiv.className = 'kentico-extensions-nav-bar-message';
    messageDiv.innerHTML =
      'Add tiles to your dashboard to populate this shorcuts bar';
    kenavbar.appendChild(messageDiv);
    kenavbar.appendChild(menuLink);
    kenavbar.appendChild(menuContent);
    kenavbar.appendChild(hideShowLink);
    kenavbar.style.width = '500px';
    masterContainer.parentNode.insertBefore(kenavbar, masterContainer);
  }
  ke_log('shortcuts bar loaded');
}

function ke_sb_build(shortcutBarItems) {
  var shortcutsSpan = document.createElement('span');
  shortcutsSpan.id = 'kentico-extensions-nav-bar-shortcuts';
  shortcutsSpan.className = 'kentico-extensions-nav-bar-shortcuts';

  for (var i = 0; i < shortcutBarItems.length; i++) {
    var shortcutLink = document.createElement('a');
    shortcutLink.id =
      'kentico-extensions-nav-bar-' +
      shortcutBarItems[i].name.toLowerCase().replace(' ', '-');
    // title not required with custom mouseover shortcut item name display
    //shortcutLink.title = shortcutBarItems[i].name;
    shortcutLink.name = shortcutBarItems[i].name;
    shortcutLink.href = '#' + shortcutBarItems[i].guid;

    shortcutLink.onmouseover = function () {
      var navbarinnerlabel = document.getElementById(
        'kentico-extensions-nav-bar-inner-label'
      );
      navbarinnerlabel.innerHTML = this.name;
      var navbarlabel = document.getElementById(
        'kentico-extensions-nav-bar-label'
      );
      navbarlabel.style.display = '';
    };
    shortcutLink.onmouseout = function () {
      var navbarlabel = document.getElementById(
        'kentico-extensions-nav-bar-label'
      );
      navbarlabel.style.display = 'none';
    };

    var shortcutIcon = document.createElement('i');
    shortcutIcon.className =
      shortcutBarItems[i].iconClass +
      ' cms-nav-icon-medium icon-' +
      shortcutBarItems[i].iconColor.toLowerCase();

    shortcutLink.appendChild(shortcutIcon);
    shortcutsSpan.appendChild(shortcutLink);
  }

  return shortcutsSpan;
}

function ke_sb_refresh(updateLocalStorage) {
  var masterContainer = document.getElementsByClassName('CMSDeskContent')[0];
  if (masterContainer === undefined) {
    return;
  }

  ke_log('shortcuts bar refreshing');

  localStorage.removeItem('data=shortcutbaritems&userid=' + ke_UserID);

  var shortcutsBar = document.getElementById('kentico-extensions-nav-bar');
  masterContainer.parentNode.removeChild(shortcutsBar);

  ke_sb_load(true);

  if (updateLocalStorage == true) {
    var cdts = ke_getCurrentDateTimeString();
    localStorage.setItem('kenticoextensions-shortcutsbar-lastupdated', cdts);
  }
}

function ke_sb_hideShow() {
  var shortcutsBar = document.getElementById('kentico-extensions-nav-bar');

  var elementToHideShow = document.getElementById(
    'kentico-extensions-nav-bar-shortcuts'
  );
  if (elementToHideShow == undefined) {
    elementToHideShow = document.getElementById(
      'kentico-extensions-nav-bar-message'
    );
  }
  if (elementToHideShow == undefined) return;

  var hideShowLink = document.getElementById(
    'kentico-extensions-nav-bar-hideshow'
  );
  var hideShowIcon = hideShowLink.getElementsByClassName('icon-hideshow')[0];
  if (hideShowIcon.className.indexOf('icon-chevron-right') > -1) {
    shortcutsBarWidth = shortcutsBar.style.width;
    hideShowIcon.className = hideShowIcon.className.replace(
      'icon-chevron-right',
      'icon-chevron-left'
    );
    hideShowLink.title = 'Show Shortcuts Bar';
    elementToHideShow.style.display = 'none';
    shortcutsBar.style.backgroundColor = '';
  } else {
    hideShowIcon.className = hideShowIcon.className.replace(
      'icon-chevron-left',
      'icon-chevron-right'
    );
    hideShowLink.title = 'Hide Shortcuts Bar';
    elementToHideShow.style.display = '';
    shortcutsBar.style.backgroundColor = '#ffffff';
  }
}

function ke_sb_showMenu() {
  document.getElementById(
    'kentico-extensions-nav-bar-menu-content'
  ).style.display = 'block';
}

function ke_sb_hideMenu() {
  document.getElementById(
    'kentico-extensions-nav-bar-menu-content'
  ).style.display = 'none';
}

/*
Extension: UI Restriction (uir)
Description: Disables specific UI elements if the user is not within the CMS UI Restriction Override role.
*/
var ke_uir_initalised = false;
var ke_uir_buttonArray = [];
document.addEventListener('ke_init_complete', ke_uir_init, false);

function ke_uir_init() {
  if (ke_uir_initalised === true) return;

  ke_log('init start');

  var extConfig = ke_getExtensionConfiguration('uir');
  if (extConfig == undefined) {
    ke_log('configuration not found');
    return;
  }

  if (extConfig.Enabled == false) {
    return;
  }

  ke_uir_getButtons();
  ke_uir_disableButtons();
  ke_uir_enableButtons();

  ke_uir_initalised = true;
}

function ke_uir_getButtons() {
  ke_uir_buttonArray = [];

  // Event Log > Clear Log button
  if (
    window.location.href.indexOf('EventLog.aspx') !== -1 &&
    document.querySelectorAll("button[value='Clear log']").length != -1
  ) {
    ke_uir_buttonArray.push(
      document.querySelectorAll("button[value='Clear log']")[0]
    );
  }

  // Media Library > List > Delete action
  if (window.location.href.indexOf('Library_List.aspx') !== -1) {
    var mlDeleteButtons = document.querySelectorAll("button[title='Delete']");
    for (var i = 0; i < mlDeleteButtons.length; i++) {
      ke_uir_buttonArray.push(mlDeleteButtons[i]);
    }
  }

  // Staging > Synchronize buttons
  if (
    window.location.href.indexOf('/Staging/Tools/Tasks/Tasks.aspx') !== -1 ||
    window.location.href.indexOf('/Staging/Tools/Data/Tasks.aspx') !== -1 ||
    window.location.href.indexOf('/Staging/Tools/Objects/Tasks.aspx') !== -1
  ) {
    var syncSubtree = document.querySelectorAll(
      "button[value='Synchronize current subtree']"
    )[0];
    if (syncSubtree !== undefined) {
      ke_uir_buttonArray.push(syncSubtree);
    }
    var syncAll = document.querySelectorAll(
      "button[value='Run complete synchronization']"
    )[0];
    if (syncAll !== undefined) {
      ke_uir_buttonArray.push(syncAll);
    }
  }
}

function ke_uir_disableButtons() {
  // disable all buttons
  for (var i = 0; i < ke_uir_buttonArray.length; i++) {
    ke_uir_buttonArray[i].disabled = true;
    ke_uir_buttonArray[i].title =
      'This has been disabled by Kentico Extensions for your safety :)';
  }
}

function ke_uir_enableButtons() {
  var qsParams = 'data=userroles&userid=' + ke_UserID;
  ke_getAPIDataAsync(qsParams, false, ke_uir_enableButtonsCallback, true);
}

function ke_uir_enableButtonsCallback(userRoles) {
  if (
    userRoles.filter((r) => {
      return r.RoleDisplayName === 'CMS UI Restriction Override';
    }).length !== 0
  ) {
    // re-enable the buttons
    for (var i = 0; i < ke_uir_buttonArray.length; i++) {
      ke_uir_buttonArray[i].disabled = false;
      ke_uir_buttonArray[i].title = 'Please use with caution!';
    }
  }
}

/*
Extension: Staging Task User Filter (stuf)
Description: Adds a user filter and column to the staging task list
*/
var ke_stuf_initalised = false;
var ke_stuf_userColumnLoaded = false;
var ke_stuf_userFilterLoaded = false;
var ke_stuf_convertTimeToLocal = false;
document.addEventListener('ke_init_complete', ke_stuf_init, false);

function ke_stuf_init() {
  if (ke_stuf_initalised === true) return;

  // detect if the current page is a staging task list
  if (
    window.location.href.indexOf(
      '/CMSModules/Staging/Tools/AllTasks/Tasks.aspx'
    ) == -1 &&
    window.location.href.indexOf(
      '/CMSModules/Staging/Tools/Tasks/Tasks.aspx'
    ) == -1 &&
    window.location.href.indexOf(
      '/CMSModules/Staging/Tools/Objects/Tasks.aspx'
    ) == -1 &&
    window.location.href.indexOf('/CMSModules/Staging/Tools/Data/Tasks.aspx') ==
      -1
  )
    return;

  // Possibly only show filter if all items are shown
  // Filter does not work well with pagination
  /*
    var itemsPerPageSelect = document.querySelectorAll("select[id$='drpPageSize']")[0];
    var itemsPerPageValue = itemsPerPageSelect[itemsPerPageSelect.selectedIndex].value;
    if (itemsPerPageValue != -1) { return; }
    */

  ke_log('init start');

  var extConfig = ke_getExtensionConfiguration('stuf');
  if (extConfig == undefined) {
    ke_log('configuration not found');
    return;
  }

  if (extConfig.Enabled == false) {
    return;
  }

  ke_stuf_convertTimeToLocal = extConfig.Config?.ConvertTimeToLocal ?? false;

  ke_stuf_showLocalDateTime();
  ke_stuf_initUserColumn(false);
  ke_stuf_initUserFilter(false);
  ke_stuf_addSelectAllCheckBox();

  Sys.WebForms.PageRequestManager.getInstance().add_endRequest(
    ke_stuf_endRequestHandler
  );

  ke_log('init complete');
  ke_stuf_initalised = true;
}

function ke_stuf_showLocalDateTime() {
  if (
    ke_stuf_convertTimeToLocal === false ||
    ke_PreferredUICultureCode !== 'en-AU'
  )
    return;

  var taskTable = document.querySelector("table[id^='m_c_']");
  var taskTableRows = taskTable.getElementsByTagName('tr');
  var timeSpan = taskTableRows[0]
    .getElementsByTagName('th')[4]
    .getElementsByClassName('unigrid-sort-label')[0];
  timeSpan.innerText += '*';
  timeSpan.setAttribute(
    'title',
    'Kentico Extensions has modified the date/times for time zone: ' +
      Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  for (var i = 1; i < taskTableRows.length; i++) {
    var dateTimeElement = taskTableRows[i].getElementsByTagName('td')[4];
    var utcDateTime = dateTimeElement.innerText;
    var day = utcDateTime.split('/')[0];
    var month = utcDateTime.split('/')[1];

    var year = utcDateTime.split('/')[2].substring(0, 4);
    var startOfTime = utcDateTime.indexOf(' ') + 1;
    var localstr =
      year +
      '-' +
      month +
      '-' +
      day +
      ' ' +
      utcDateTime.substring(startOfTime) +
      ' UTC';
    var localDateTime = new Date(localstr);
    dateTimeElement.innerText = localDateTime.format('dd/MM/yyyy h:mm:ss tt');
  }
}

function ke_stuf_initUserColumn(refreshData) {
  var serverSelect = document.querySelectorAll(
    "select[id$='drpSingleSelect']"
  )[0];
  var serverid = serverSelect.options[serverSelect.selectedIndex].value;
  var qsParams = 'data=stagingtasks&serverid=' + serverid;
  ke_getAPIDataAsync(qsParams, refreshData, ke_stuf_addUserColumn, true);
}

function ke_stuf_addUserColumn(taskData) {
  //get table
  //iterate each row and add th or td
  var taskTable = document.querySelector("table[id^='m_c_']");
  var taskTitleCol = taskTable.getElementsByTagName('th')[2];
  var headerCol = document.createElement('th');
  headerCol.innerHTML = 'User';
  taskTitleCol.insertAdjacentElement('afterend', headerCol);

  var taskTableRows = taskTable.getElementsByTagName('tr');
  var currentTaskID = 0;
  var titleCol;
  var currentInput;
  for (var i = 1; i < taskTableRows.length; i++) {
    currentInput = taskTableRows[i].getElementsByTagName('input')[0];
    currentTaskID = currentInput.getAttribute('data-arg');
    currentTaskID = Number(currentTaskID);
    titleCol = taskTableRows[i].getElementsByTagName('td')[2];
    var userCol = document.createElement('td');
    var taskRecord = ke_stuf_getTaskByTaskID(taskData, currentTaskID);
    if (taskRecord == undefined) {
      userCol.innerHTML = '&nbsp;';
      titleCol.insertAdjacentElement('afterend', userCol);
      currentInput.setAttribute('data-useridlist', 0);
      taskTableRows[i].setAttribute('data-useridlist', 0);
    } else {
      userCol.innerHTML = taskRecord.UserFullNameList;
      titleCol.insertAdjacentElement('afterend', userCol);
      currentInput.setAttribute('data-useridlist', taskRecord.UserIDList);
      taskTableRows[i].setAttribute('data-useridlist', taskRecord.UserIDList);
    }
  }
  ke_stuf_userColumnLoaded = true;
  ke_stuf_refreshFilter();
}

function ke_stuf_getTaskByTaskID(taskData, taskID) {
  for (var i = 0; i < taskData.length; i++) {
    if (taskData[i].TaskID == taskID) {
      return taskData[i];
    }
  }
}

function ke_stuf_initUserFilter(refreshData) {
  var serverSelect = document.querySelectorAll(
    "select[id$='drpSingleSelect']"
  )[0];
  var serverid = serverSelect.options[serverSelect.selectedIndex].value;
  var qsParams = 'data=stagingusers&serverid=' + serverid;
  ke_getAPIDataAsync(qsParams, refreshData, ke_stuf_addUserFilter, true);
}

function ke_stuf_addUserFilter(userData) {
  var panelContainer = document.getElementById('m_pnlContainer');
  if (panelContainer === null) {
    return;
  }

  var userPanel = document.createElement('div');
  userPanel.id = 'm_pnlUserSelector';
  userPanel.className = 'header-panel';
  userPanel.style = 'padding: 8px 16px 8px 16px';

  var userFilterContainer = document.createElement('div');
  userFilterContainer.className =
    'form-horizontal form-filter user-selector ke-stuf-filter-container';
  userFilterContainer.style = 'float: right';

  var userLabel = document.createElement('div');
  userLabel.className = 'filter-form-label-cell';
  userLabel.innerHTML =
    '<span id="usersLabel" class="control-label">User:</span>';

  var userFilter = document.createElement('div');
  userFilter.className = 'filter-form-value-cell-wide';

  var userSelect = document.createElement('select');
  userSelect.id = 'kentico-extensions-user-filter';
  userSelect.className = 'DropDownField form-control';

  var optAll = document.createElement('option');
  optAll.value = 0;
  optAll.innerHTML = 'All';
  userSelect.appendChild(optAll);

  for (var i = 0; i < userData.length; i++) {
    var opt = document.createElement('option');
    opt.value = userData[i].UserID;
    opt.innerHTML = userData[i].UserFullName;
    userSelect.appendChild(opt);
  }

  userFilter.appendChild(userSelect);

  userFilterContainer.appendChild(userLabel);
  userFilterContainer.appendChild(userFilter);

  userPanel.appendChild(userFilterContainer);

  // if actions does not exist add it for styling
  var actionsPanel = document.createElement('div');
  actionsPanel.id = 'm_pnlActions';
  actionsPanel.className = 'cms-edit-menu';

  if (document.getElementById('m_pnlActions') === null) {
    panelContainer.appendChild(actionsPanel);
  }

  panelContainer.appendChild(userPanel);

  userSelect.addEventListener('change', ke_stuf_applyFilter, false);

  ke_stuf_userFilterLoaded = true;

  var contentPanel = document.getElementById('m_pnlContent');
  if (contentPanel === null) {
    return;
  }
  contentPanel.style = 'margin-top: 28px';
}

function ke_stuf_addSelectAllCheckBox() {
  var kenticoSelectAllCheckbox = document.querySelector(
    "input[id$='headerBox']"
  );
  if (kenticoSelectAllCheckbox == null) {
    return;
  }

  var customSelectAllCheckbox = document.createElement('input');
  customSelectAllCheckbox.id = 'kentico-extensions-select-all';
  customSelectAllCheckbox.type = 'checkbox';
  customSelectAllCheckbox.disabled = true;
  customSelectAllCheckbox.addEventListener('click', ke_stuf_selectAll, false);

  var customSelectAllCheckboxLabel = document.createElement('label');
  customSelectAllCheckboxLabel.id = 'kentico-extensions-select-all-label';
  customSelectAllCheckboxLabel.htmlFor = 'kentico-extensions-select-all';
  customSelectAllCheckboxLabel.style.display = 'none';
  customSelectAllCheckboxLabel.innerHTML = '&nbsp;';

  kenticoSelectAllCheckbox.parentNode.insertBefore(
    customSelectAllCheckbox,
    kenticoSelectAllCheckbox
  );
  kenticoSelectAllCheckbox.parentNode.insertBefore(
    customSelectAllCheckboxLabel,
    kenticoSelectAllCheckbox
  );
}

function ke_stuf_refreshFilter() {
  if (ke_stuf_userFilterLoaded && ke_stuf_userColumnLoaded) {
    ke_stuf_applyFilter();
  }
}

function ke_stuf_applyFilter() {
  var userSelect = document.getElementById('kentico-extensions-user-filter');
  var selectedUserID = userSelect.selectedOptions[0].value;

  if (selectedUserID != 0) {
    document.querySelector("input[id$='headerBox']").checked = false;
    document.querySelector("input[id$='headerBox']").disabled = true;
    document.querySelector('label[for*="headerBox"').style.display = 'none';
    document.getElementById('kentico-extensions-select-all').disabled = false;
    document.getElementById(
      'kentico-extensions-select-all-label'
    ).style.display = '';
    document.getElementById('m_c_btnSyncAll').disabled = true;
    document.getElementById('m_c_btnDeleteAll').disabled = true;
  } else {
    document.querySelector("input[id$='headerBox']").disabled = false;
    document.querySelector('label[for*="headerBox"').style.display = '';
    document.getElementById('kentico-extensions-select-all').disabled = true;
    document.getElementById(
      'kentico-extensions-select-all-label'
    ).style.display = 'none';
    document.getElementById('m_c_btnSyncAll').disabled = false;
    document.getElementById('m_c_btnDeleteAll').disabled = false;
  }

  //iterate each row, if not assigned to user, hide the row
  var taskTable = document.querySelector("table[id^='m_c_']");
  var taskTableRows = taskTable.getElementsByTagName('tr');
  var currentUserID = 0;
  var currentInput;
  var visibleRows = 0;
  var selectedRows = 0;
  for (var i = 1; i < taskTableRows.length; i++) {
    currentUserIDList = taskTableRows[i].getAttribute('data-useridlist');
    if (currentUserIDList == null) {
      continue;
    }
    currentInput = taskTableRows[i].getElementsByTagName('input')[0];

    if (currentUserIDList.indexOf('|' + selectedUserID + '|') !== -1) {
      taskTableRows[i].style = 'display: table-row;';
      visibleRows++;
    } else if (selectedUserID === '0') {
      taskTableRows[i].style = 'display: table-row;';
      visibleRows++;
    } else {
      taskTableRows[i].style = 'display: none;';
      if (currentInput.checked) {
        var clickEvent = new MouseEvent('click');
        currentInput.dispatchEvent(clickEvent);
      }
    }

    if (currentInput.checked) {
      selectedRows++;
    }
  }

  // if all visible rows are selected, check the select all checkbox
  if (visibleRows == selectedRows) {
    document.getElementById('kentico-extensions-select-all').checked = true;
  } else {
    document.getElementById('kentico-extensions-select-all').checked = false;
  }

  ke_log(document.querySelector("input[id$='hidSelection']").value);
}

function ke_stuf_endRequestHandler(sender, args) {
  ke_stuf_showLocalDateTime();
  ke_stuf_initUserColumn(true);
  ke_stuf_addSelectAllCheckBox();
  ke_stuf_refreshFilter();
}

function ke_stuf_selectAll() {
  var selectAll = document.getElementById(
    'kentico-extensions-select-all'
  ).checked;
  var userSelect = document.getElementById('kentico-extensions-user-filter');
  var selectedUserID = Number(userSelect.selectedOptions[0].value);
  var taskTable = document.querySelector("table[id^='m_c_']");
  var taskTableRows = taskTable.getElementsByTagName('tr');
  var currentUserID = 0;
  var currentInput;
  for (var i = 1; i < taskTableRows.length; i++) {
    currentUserID = taskTableRows[i].getAttribute('data-userid');
    if (currentUserID == null) {
      continue;
    }
    currentUserID = Number(taskTableRows[i].getAttribute('data-userid'));
    currentInput = taskTableRows[i].getElementsByTagName('input')[0];

    var clickEvent = new MouseEvent('click');
    if (selectedUserID == currentUserID && selectAll) {
      if (currentInput.checked == false) {
        currentInput.dispatchEvent(clickEvent);
      }
    } else {
      if (currentInput.checked) {
        currentInput.dispatchEvent(clickEvent);
      }
    }
  }

  ke_log(document.querySelector("input[id$='hidSelection']").value);
}

/*
Extension: Media Selector (ms)
Description: Adds the selected images dimensions and file size as a label next to the thumbnail
*/
var ke_ms_initalised = false;
document.addEventListener('ke_init_complete', ke_ms_init, false);

function ke_ms_init() {
  if (ke_ms_initalised == true) return;

  var mediaSelectors = document.getElementsByClassName('media-selector-image');
  if (mediaSelectors.length == 0) {
    return;
  }

  ke_log('init start', true);

  var extConfig = ke_getExtensionConfiguration('ms');
  if (extConfig == undefined) {
    ke_log('configuration not found');
    return;
  }

  if (extConfig.Enabled == false) {
    return;
  }

  var mutationObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (
        mutation.addedNodes.length == 1 &&
        mutation.addedNodes[0].id != undefined &&
        mutation.addedNodes[0].id.indexOf('mediaSelector') > 0
      ) {
        ke_ms_addImageSizeLabel(mutation.target);
      }
    });
  });

  for (var i = 0; i < mediaSelectors.length; i++) {
    var ms = mediaSelectors[i];
    ke_ms_addImageSizeLabel(ms);
    mutationObserver.observe(ms, { childList: true });
    ke_log('appending information to media selector: ' + ms.id, true);
  }

  ke_log('init complete', true);
  ke_ms_initalised = true;
}

function ke_ms_addImageSizeLabel(ms) {
  ms = ms.parentNode;
  var msinput = ms.getElementsByTagName('input')[0];
  var imageurl = msinput.value;
  var msimage = ms.getElementsByTagName('img')[0];
  if (msimage !== undefined) {
    var fileguid = imageurl.substr(imageurl.indexOf('getmedia/') + 9, 36);
    var width = ke_getQueryStringValue('width', imageurl);
    var height = ke_getQueryStringValue('height', imageurl);
    var qsParams =
      'data=mediafileinfo&fileguid=' +
      fileguid +
      '&width=' +
      width +
      '&height=' +
      height;
    ke_getAPIDataAsync(qsParams, false, ke_ms_addImageSizeLabelCallback, true);
  }
}

function ke_ms_addImageSizeLabelCallback(mediaFile) {
  var imagedimensions = mediaFile.Width + 'x' + mediaFile.Height;
  var labeltext =
    '<br><b>Size:</b> ' +
    imagedimensions +
    ' (' +
    ke_formatBytes(mediaFile.Size) +
    ')';
  var detailshtml =
    mediaFile.Title !== '' ? '<br><b>Title:</b> ' + mediaFile.Title : '';
  detailshtml +=
    mediaFile.Description !== ''
      ? '<br><b>Alt Text:</b> ' + mediaFile.Description
      : '';

  var msimage = document.querySelectorAll(
    "img[src*='" + mediaFile.GUID + "'"
  )[0].parentNode;

  var mslabel;
  if (msimage.getElementsByClassName('ke-ms-label').length > 0) {
    mslabel = msimage.getElementsByClassName('ke-ms-label')[0];
  }

  // use create element and append to dom
  if (mslabel != undefined) {
    mslabel.innerHTML = labeltext + detailshtml;
  } else {
    msimage.innerHTML +=
      '&nbsp<div class="ke-ms-label" title="Information provided by Kentico Extensions :)">' +
      labeltext +
      detailshtml +
      '</div>';
  }
}

/*
Extension: Tree Information (ti)
Description: Displays additional information within the content tree.
*/
var ke_ti_initalised = false;
document.addEventListener('ke_init_complete', ke_ti_init, false);

function ke_ti_init() {
  if (ke_ti_initalised === true) return;

  if (
    window.location.href.indexOf('/CMSModules/Content/CMSDesk/Default.aspx') ==
      -1 ||
    document.getElementsByClassName('ContentTree').length == 0
  ) {
    return;
  }
  ke_log('init start');

  var extConfig = ke_getExtensionConfiguration('ti');
  if (extConfig == undefined) {
    ke_log('configuration not found');
    return;
  }

  if (extConfig.Enabled == false) {
    return;
  }

  ke_ti_load();

  ke_log('init complete');
  ke_ti_initalised = true;
}

function ke_ti_load() {
  // no need to pass current culture since it uses a different domain
  var qsParams = 'data=treeinfo';
  ke_getAPIDataAsync(qsParams, false, ke_ti_loadCallback, true);

  var mutationObserver = new MutationObserver(ke_ti_mutationHandler);

  var contentTree = document.querySelectorAll(
    "div[id$='contentcontrolpanel']"
  )[0];
  mutationObserver.observe(contentTree, { childList: true, subtree: true });
}

function ke_ti_mutationHandler(mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var mutation = mutations[i];
    if (
      mutation.addedNodes.length > 0 &&
      mutation.addedNodes[0].className != 'ke-ti-info-div'
    ) {
      ke_log('content tree muation detected');
      ke_getAPIDataAsync('data=treeinfo', false, ke_ti_loadCallback, true);
    }
  }
}

function ke_ti_loadCallback(treeItems) {
  var spanElements = document.querySelectorAll("span[id^='target_']");

  var bodyElement = document.getElementsByTagName('body')[0];

  for (var i = 0; i < spanElements.length; i++) {
    var parentElement = spanElements[i].parentNode;
    var nodeID = spanElements[i].id.replace('target_', '');
    var treeItem = ke_ti_getTreeItemInfo(treeItems, nodeID);

    if (treeItem == null) continue;

    var currentDiv = document.getElementById('ke_ti_node_' + nodeID);
    var infoDiv = currentDiv;

    if (infoDiv == undefined) {
      var infoDiv = document.createElement('div');
      infoDiv.id = 'ke_ti_node_' + nodeID;
      infoDiv.className = 'ke-ti-info-div';
      infoDiv.style.display = 'none';
      infoDiv.innerHTML =
        '<strong>Node Name:</strong> ' + treeItem.NodeName + '<br />';
      infoDiv.innerHTML +=
        '<strong>Node ID:</strong> ' + treeItem.NodeID + '<br />';
      infoDiv.innerHTML +=
        '<strong>Node GUID:</strong> ' + treeItem.NodeGUID + '<br />';
      infoDiv.innerHTML +=
        "<strong>Node Alias Path:</strong> <a target='_blank' href='" +
        treeItem.AbsolutePath +
        "'>" +
        treeItem.NodeAliasPath +
        '</a><br />';
      infoDiv.innerHTML +=
        '<strong>Page Type:</strong> ' +
        treeItem.ClassDisplayName +
        ' [' +
        treeItem.ClassName +
        ']<br />';
      infoDiv.innerHTML +=
        '<strong>Page Template:</strong> ' +
        treeItem.PageTemplateDisplayName +
        ' [' +
        treeItem.PageTemplateCodeName +
        ']';
    }

    infoDiv.onmouseover = function () {
      this.style.display = 'block';
    };
    infoDiv.onmouseout = function () {
      this.style.display = 'none';
    };

    //apend to different div so box doesn't get cut off
    bodyElement.appendChild(infoDiv);

    parentElement.onmouseover = function () {
      // hide all existing info panels
      var elementArray = document.querySelectorAll('.ke-ti-info-div');
      for (var i = 0; i < elementArray.length; i++) {
        elementArray[i].style.display = 'none';
      }

      // set position and show
      var spanElement = this.firstElementChild;
      var nodeID = spanElement.id.replace('target_', '');
      var infoDiv = document.getElementById('ke_ti_node_' + nodeID);
      var clientHeight = document.getElementById('node_' + nodeID).clientHeight;

      // content tree splitter
      var contentTreeSplitterRect = document
        .getElementsByClassName('ui-layout-resizer-west')[0]
        .getBoundingClientRect();
      infoDiv.style.top = contentTreeSplitterRect.bottom - 125 - 30 + 'px';
      infoDiv.style.left = contentTreeSplitterRect.right + 10 + 'px';

      //infoDiv.style.top = (spanElement.getBoundingClientRect().top + (clientHeight - 2)) + "px";
      //infoDiv.style.left = spanElement.getBoundingClientRect().left + 20 + "px";
      infoDiv.style.display = '';
    };
    parentElement.onmouseout = function () {
      var nodeID = this.firstElementChild.id.replace('target_', '');
      setTimeout(function () {
        if (
          document.getElementById('ke_ti_node_' + nodeID).style.display == ''
        ) {
          document.getElementById('ke_ti_node_' + nodeID).style.display =
            'none';
        }
      }, 3000);
    };
  }
}

function ke_ti_getTreeItemInfo(treeItems, NodeID) {
  for (var i = 0; i < treeItems.length; i++) {
    if (treeItems[i].NodeID == NodeID) {
      return treeItems[i];
    }
  }
  return null;
}

/*
Extension: Document Information (di)
Description: Displays additional information within the document view.
*/
var ke_di_initalised = false;
document.addEventListener('ke_init_complete', ke_di_init, false);

function ke_di_init() {
  if (ke_di_initalised === true) return;

  if (
    window.location.href.indexOf(
      '/CMSModules/AdminControls/Pages/UIPage.aspx'
    ) == -1 ||
    document.getElementsByClassName('nav-tabs').length == 0
  ) {
    return;
  }
  ke_log('init start');

  var extConfig = ke_getExtensionConfiguration('di');
  if (extConfig == undefined) {
    ke_log('configuration not found');
    return;
  }

  if (extConfig.Enabled == false) {
    return;
  }

  ke_di_load();

  ke_log('init complete');
  ke_di_initalised = true;
}

function ke_di_load() {
  var nodeID = ke_getQueryStringValue('nodeid');
  if (nodeID == null || nodeID == '') return;
  var qsParams = 'data=documentinfo&nodeid=' + nodeID;
  ke_getAPIDataAsync(qsParams, false, ke_di_loadCallback, true);
}

function ke_di_loadCallback(docItems) {
  var navTabs = document.getElementsByClassName('nav-tabs')[0];
  if (navTabs == undefined) return;

  if (docItems.length < 1) return;
  var docItem = docItems[0];
  var dateTimeString = docItem.DocumentModifiedWhen.replace('T', ' ').substring(
    0,
    19
  );
  dateTimeString = ke_getISODateTimeString(docItem.DocumentModifiedWhen, '12');

  var infoDiv = document.createElement('div');
  infoDiv.id = 'ke_di_node_' + docItem.NodeID;
  infoDiv.className = 'ke-di-info-div';
  infoDiv.innerHTML =
    '<strong>Last modified:</strong> ' +
    docItem.DocumentModifiedBy +
    ' (' +
    dateTimeString +
    ')';
  infoDiv.innerHTML +=
    " | <a href='" +
    docItem.AbsolutePath +
    " 'target='_blank'>Live Version</a><br />";

  navTabs.appendChild(infoDiv);
}

function ke_di_getDocumentItemInfo(docItems, NodeID) {
  for (var i = 0; i < docItems.length; i++) {
    if (docItems[i].NodeID == NodeID) {
      return docItems[i];
    }
  }
  return null;
}

/*
Extension: Konsole (ko)
Description: Provides an interactive console for developers
*/
var kb_ko_initalised = false;
var kb_ko_config = null;
document.addEventListener('ke_init_complete', ke_ko_init, false);

var ke_ko_inputhistory = [];
var ke_ko_inputhistorycount = 1;
var ko_ke_element = null;
var ke_ko_mouse_x_pos = 0,
  ke_ko_mouse_y_pos = 0;
var ke_ko_x_pos = 0,
  ke_ko_y_pos = 0;
var ke_ko_matrixLoaded = false;

function ke_ko_init() {
  if (kb_ko_initalised === true) return;

  kb_ko_config = ke_getExtensionConfiguration('ko');
  if (kb_ko_config == undefined) {
    ke_log('Konsole configuration not found.');
    return;
  }

  if (kb_ko_config.Enabled === false) {
    return;
  }

  if (ke_ko_appendElements()) {
    ke_ko_binding();
  }

  ke_ko_globalBinding();

  if (
    ke_getQueryStringValue('showkonsole') === 'true' ||
    document.getElementById('konsole') !== null
  )
    ke_ko_show();

  kb_ko_initalised = true;
}

function ke_ko_appendElements() {
  var masterContainer = document.getElementsByClassName('CMSDeskContent')[0];
  if (masterContainer === undefined) {
    masterContainer = document.getElementById('konsole');
    if (masterContainer === undefined || masterContainer === null) return false;
  }

  var konsole = document.createElement('div');
  konsole.id = 'ke-ko';
  konsole.className = 'ke-ko resizable';
  konsole.style =
    'top: 48px; left: 0px; width: ' +
    (window.innerWidth - 18) +
    'px;' +
    ' display: none;';
  if (masterContainer.id === 'konsole')
    konsole.style =
      'top: 0px; left: 0px; width: ' + (window.innerWidth - 18) + 'px;';
  konsole.setAttribute('data-dockstatus', 'full');

  var konsoleHeader = document.createElement('div');
  konsoleHeader.id = 'ke-ko-header';
  konsoleHeader.className = 'ke-ko-header';
  konsoleHeader.setAttribute('data-dockstatus', 'default');
  konsoleHeader.ondblclick = function () {
    ke_ko_dock('headerdblclick');
    return false;
  };
  konsoleHeader.innerHTML = `<div class="ke-ko-toolbar left"><img src="/kenticoextensions/icons/terminal-fill.svg" /></div>`;
  konsoleHeader.innerHTML += 'Kentico Extensions Konsole';
  konsoleHeader.innerHTML += `<div class="ke-ko-toolbar right">
    <a onclick="ke_ko_runCommand('help');return false;" title="help"><img src="/kenticoextensions/icons/question-square-fill.svg" /></span></a>
<a onclick="ke_ko_runCommand('dock left');return false;" title="dock left"><img src="/kenticoextensions/icons/arrow-left-square-fill.svg" /></span></a>
<a onclick="ke_ko_runCommand('dock right');return false;" title="dock right"><img src="/kenticoextensions/icons/arrow-right-square-fill.svg" /></i></a>
<a onclick="ke_ko_runCommand('dock reset');return false;" title="restore"><img src="/kenticoextensions/icons/arrow-down-left-square-fill.svg" /></a>
<a onclick="ke_ko_runCommand('dock full');return false;" title="maximise"><img src="/kenticoextensions/icons/arrow-up-right-square-fill.svg" /></a>
<a onclick="ke_ko_runCommand('hide');return false;" title="close"><img src="/kenticoextensions/icons/x-square-fill.svg" /></div>`;
  konsole.appendChild(konsoleHeader);

  var konsoleContent = document.createElement('div');
  konsoleContent.id = 'ke-ko-content';
  konsoleContent.className = 'ke-ko-content';
  konsoleContent.style.height = window.innerHeight - 50 - 48 + 'px';
  if (masterContainer.id === 'konsole')
    konsoleContent.style.height = window.innerHeight - 50 + 'px';
  konsole.appendChild(konsoleContent);

  var konsoleOutputContainer = document.createElement('div');
  konsoleOutputContainer.id = 'ke-ko-output-container';
  konsoleOutputContainer.className = 'ke-ko-output-container';

  var konsoleBanner = document.createElement('div');
  konsoleBanner.id = 'ke-ko-banner';
  konsoleBanner.className = 'ke-ko-banner';

  var konsoleOutput = document.createElement('div');
  konsoleOutput.id = 'ke-ko-output';
  konsoleOutput.className = 'ke-ko-output';

  var helpLink = `<a href="#" onclick="ke_ko_runCommand('help');return false;">help</a>`;
  konsoleBanner.innerHTML =
    `
_________________________________________________
|   __                              __          |
|  |  | ___ ___  __   _ _____ ____ |  |  ____   |
|  |  |/  /  _ \\|   \\| |  ___|  _ \\|  | | ___|  |
|  |     /| |_| | |\\   |__  || |_| |  |_| _|    |
|  |__|\\__\\____/|_| \\__|____|\\____/|____|____|  |
|_______________________________________________|
Type '` +
    helpLink +
    `' for ` +
    helpLink +
    `!<br>`;

  konsoleOutputContainer.appendChild(konsoleBanner);
  konsoleOutputContainer.appendChild(konsoleOutput);
  konsoleContent.appendChild(konsoleOutputContainer);

  var konsoleInputContainer = document.createElement('div');
  konsoleInputContainer.id = 'ke-ko-input-container';
  konsoleInputContainer.className = 'ke-ko-input-container';
  konsoleContent.appendChild(konsoleInputContainer);

  var keLabel = document.createElement('div');
  keLabel.id = 'ke-ko-label';
  keLabel.className = 'ke-ko-label';
  keLabel.innerHTML = 'ke>';
  konsoleInputContainer.appendChild(keLabel);

  var konsoleInput = document.createElement('input');
  konsoleInput.id = 'ke-ko-input';
  konsoleInput.className = 'ke-ko-input';
  konsoleInputContainer.appendChild(konsoleInput);

  var konsoleSpinner = document.createElement('div');
  konsoleSpinner.id = 'ke-ko-spinner';
  konsoleSpinner.className = 'ke-ko-spinner';
  konsoleSpinner.style.display = 'none';
  konsoleInputContainer.appendChild(konsoleSpinner);

  var konsoleAfterInput = document.createElement('div');
  konsoleAfterInput.id = 'ke-ko-afterinput';
  konsoleAfterInput.className = 'ke-ko-afterinput';
  konsoleInputContainer.appendChild(konsoleAfterInput);

  var konsoleMatrix = document.createElement('canvas');
  konsoleMatrix.id = 'ke-ko-matrix';
  konsoleMatrix.className = 'ke-ko-matrix';
  konsole.appendChild(konsoleMatrix);

  masterContainer.parentNode.insertBefore(konsole, masterContainer);
  return true;
}

function ke_ko_binding() {
  document
    .getElementById('ke-ko-input')
    .addEventListener('keyup', function (event) {
      event.preventDefault();
      if (event.keyCode == 13) {
        ke_ko_processInput();
        ke_ko_inputhistorycount = 1;
      }
      if (event.keyCode == 38) {
        if (ke_ko_inputhistorycount > ke_ko_inputhistory.length) {
          return;
        }
        document.getElementById('ke-ko-input').value =
          ke_ko_inputhistory[
            ke_ko_inputhistory.length - ke_ko_inputhistorycount
          ];
        ke_ko_inputhistorycount++;
      }
      if (event.keyCode == 40) {
        ke_ko_inputhistorycount--;
        if (
          ke_ko_inputhistorycount == 0 ||
          ke_ko_inputhistorycount > ke_ko_inputhistory.length
        ) {
          ke_ko_inputhistorycount = 1;
          return;
        }
        document.getElementById('ke-ko-input').value =
          ke_ko_inputhistory[
            ke_ko_inputhistory.length - ke_ko_inputhistorycount
          ];
      }
    });

  document
    .getElementById('ke-ko-afterinput')
    .addEventListener('click', function () {
      document.getElementById('ke-ko-input').focus();
    });

  document.getElementById('ke-ko').addEventListener('dblclick', function () {
    document.getElementById('ke-ko-input').focus();
  });

  document
    .getElementById('ke-ko-matrix')
    .addEventListener('click', function () {
      ke_ko_hideMatrix();
    });

  // bind to F9 event
  window.addEventListener('storage', ke_ko_localStorageCheck);

  // click and drag events
  document.getElementById('ke-ko-header').onmousedown = function () {
    ke_ko_drag_init();
    return false;
  };
  document.onmousemove = ke_ko_move;
  document.onmouseup = ke_ko_destroy;
}

function ke_ko_globalBinding() {
  // F9 and ESC event listeners need to bound on all documents
  document.addEventListener('keyup', function (event) {
    // F9 shows and hides konsole
    if (event.keyCode == 120) {
      localStorage.setItem(
        'kenticoextensions-konsole-f9',
        ke_getCurrentDateTimeString()
      );
      ke_ko_showHide();
    }
    // ESC will hide matrix
    if (event.keyCode == 27) {
      localStorage.setItem(
        'kenticoextensions-konsole-esc',
        ke_getCurrentDateTimeString()
      );
      ke_ko_hideMatrix();
    }

    // Alt+1
    if (event.altKey == true && event.keyCode == 49) {
      ke_ko_show();
      ke_ko_runCommand('ls ct');
    }
  });
}

function ke_ko_localStorageCheck(e) {
  if (e.key == 'kenticoextensions-konsole-f9') {
    ke_ko_showHide();
  }
  if (e.key == 'kenticoextensions-konsole-esc') {
    ke_ko_hideMatrix();
  }
}

function ke_ko_showHide() {
  if (document.hasFocus() === false) return;

  var konsole = document.getElementById('ke-ko');
  if (konsole !== null) {
    if (konsole.style.display == 'none') {
      document.getElementById('ke-ko').style.display = '';
      document.getElementById('ke-ko-input').focus();
    } else {
      document.getElementById('ke-ko').style.display = 'none';
    }
  }
}

function ke_ko_show() {
  var konsole = document.getElementById('ke-ko');
  if (konsole !== null) {
    document.getElementById('ke-ko').style.display = '';
    document.getElementById('ke-ko-input').focus();
  }
}

function ke_ko_hide() {
  var konsole = document.getElementById('ke-ko');
  if (konsole !== null) {
    document.getElementById('ke-ko').style.display = 'none';
  }
}

function ke_ko_runCommand(command) {
  document.getElementById('ke-ko-input').value = command;
  ke_ko_processInput();
}

function ke_ko_eqMode() {
  var kekoLabel = document.getElementById('ke-ko-label');
  return kekoLabel.innerHTML === 'eq&gt;';
}

function ke_ko_processInput() {
  try {
    ke_ko_processInputExecution();
  } catch (e) {
    ke_log(e.message);
    ke_ko_commandComplete(
      "<br><span class='ke-ko-error-message'>Bugger! Unfortunatley, an error occurred. Check the console log for details.</span>"
    );
  }
}

function ke_ko_processInputExecution() {
  document.getElementById('ke-ko-spinner').style.display = 'block';

  var inputElement = document.getElementById('ke-ko-input');
  var inputValue = inputElement.value;
  var outputElement = document.getElementById('ke-ko-output');

  if (
    ke_ko_inputhistory.length == 0 ||
    inputValue != ke_ko_inputhistory[ke_ko_inputhistory.length - 1]
  ) {
    ke_ko_inputhistory.push(inputValue);
  }

  if (inputValue === 'test error') throw 'Test Error';

  if (inputValue === 'clear') outputElement.innerHTML = '';

  if (inputValue.startsWith('dock')) ke_ko_dock();

  if (inputValue === 'hide') ke_ko_hide();

  if (inputValue === 'matrix') ke_ko_showMatrix();

  if (
    inputValue === 'clear' ||
    inputValue.startsWith('dock') ||
    inputValue === 'hide' ||
    inputValue === 'matrix'
  ) {
    ke_ko_commandComplete();
    return;
  }

  if (inputValue === 'wait') {
    setTimeout(function () {
      console.log('waiting...');
      ke_ko_commandComplete();
    }, 5000);
    return;
  }

  if (inputValue === 'help') return ke_ko_showHelp();

  if (ke_ko_eqMode()) {
    if (inputValue === 'exit') return ke_ko_executeQueryMode(false);
    else return ke_ko_executeQuery();
  }

  if (inputValue === 'exit') {
    ke_ko_hide();
    ke_ko_commandComplete();
    return;
  }

  if (ke_ko_commandShortcuts(inputValue)) return;

  if (inputValue.startsWith('ls pt')) return ke_ko_listPageTypes();

  if (inputValue.startsWith('ls ct')) return ke_ko_listCustomTables();

  if (inputValue.startsWith('ls mc')) return ke_ko_listModuleClasses();

  if (inputValue.startsWith('ls dts')) return ke_ko_listDatabaseTableSchema();
  else if (inputValue.startsWith('ls dt')) return ke_ko_listDatabaseTables();

  if (inputValue.startsWith('ls cs')) return ke_ko_listClassSchema();

  if (inputValue.startsWith('ls cosh')) return ke_ko_listCommandShortcuts();

  if (inputValue.startsWith('ls si')) return ke_ko_listSites();

  if (inputValue.startsWith('ls sk')) return ke_ko_listSettingKeys();

  if (inputValue.startsWith('ls td')) return ke_ko_listTreeData();

  if (inputValue.startsWith('ls mf')) return ke_ko_listMediaFiles();

  if (inputValue.startsWith('ls rp')) return ke_ko_listReports();

  if (inputValue.startsWith('ls fm')) return ke_ko_listForms();

  if (inputValue.startsWith('eq') && ke_GlobalAdmin === false)
    return ke_ko_commandComplete(
      "<br><span class='ke-ko-error-message'>This command is restricted to Global Admins only<span>"
    );

  if (inputValue.startsWith('eq list')) return ke_ko_listConfigQueries();
  if (inputValue.startsWith('eq mode')) return ke_ko_executeQueryMode(true);
  if (inputValue.startsWith('eq')) return ke_ko_executeQuery();

  if (inputValue.startsWith('ls endpoints')) return ke_ko_listEndpoints();

  if (
    kb_ko_config !== null &&
    kb_ko_config.Config !== undefined &&
    kb_ko_config.Config.endpoints !== undefined &&
    kb_ko_config.Config.endpoints.length !== 0
  ) {
    var commandMatch = kb_ko_config.Config.endpoints.find((c) =>
      inputValue.startsWith(c.command)
    );
    if (commandMatch !== undefined) {
      return ke_ko_openURL(commandMatch.endpoint, commandMatch.parameters);
    }
  }

  ke_ko_commandComplete(
    "<br><span class='ke-ko-error-message'>Please check the command and try again. For a full list of available commands type help.</span>"
  );
}

function ke_ko_commandShortcuts(inputValue) {
  if (
    kb_ko_config === null ||
    kb_ko_config.Config === undefined ||
    kb_ko_config.Config.commandShortcuts === undefined ||
    kb_ko_config.Config.commandShortcuts.length === 0
  ) {
    return false;
  }

  var itemMatch = kb_ko_config.Config.commandShortcuts.find(
    (s) => s.shortcut === inputValue
  );
  if (itemMatch === undefined) return false;

  ke_ko_runCommand(itemMatch.command);
  return true;
}

function ke_ko_openURL(urlPath, paramName) {
  var siteURL =
    window.location.protocol +
    '//' +
    window.location.hostname.replace('cms', 'site');
  var fullURL = siteURL + urlPath;

  if (paramName !== undefined && paramName !== null && paramName !== '') {
    var paramValue = ke_ko_getInputArgument(2);
    if (paramValue !== '') fullURL += '?' + paramName + '=' + paramValue;
  }
  var urlLink = `<a target="_blank" href="` + fullURL + `">` + fullURL + `</a>`;
  ke_ko_commandComplete(
    `<br><span style="color: cyan">Attempting to open ` +
      urlLink +
      ` in a new tab.</span>`
  );
  setTimeout(function () {
    window.open(fullURL, '_blank');
  }, 500);
}

function ke_ko_getUserRoles(callback) {
  var qsParams = 'data=userroles&userid=' + ke_UserID;
  ke_getAPIDataAsync(qsParams, false, callback, true);
}

function ke_ko_commandComplete(output) {
  var spinnerElement = document.getElementById('ke-ko-spinner');
  if (spinnerElement === null) return;

  spinnerElement.style.display = 'none';
  var inputElement = document.getElementById('ke-ko-input');
  var outputElement = document.getElementById('ke-ko-output');
  var eqMode = ke_ko_eqMode();
  if (
    outputElement.innerHTML.endsWith('<br>') ||
    outputElement.innerHTML == ''
  ) {
    outputElement.innerHTML += (eqMode ? 'eq>' : 'ke>') + inputElement.value;
  } else {
    outputElement.innerHTML +=
      '<br>' + (eqMode ? 'eq>' : 'ke>') + inputElement.value;
  }
  if (output !== undefined) outputElement.innerHTML += output;
  inputElement.value = '';
  inputElement.scrollIntoView();
  document.getElementById('ke-ko-content').scrollLeft = 0;
}

function ke_ko_drag_init() {
  ko_ke_element = document.getElementById('ke-ko');
  ke_ko_x_pos = ke_ko_mouse_x_pos - ko_ke_element.offsetLeft;
  ke_ko_y_pos = ke_ko_mouse_y_pos - ko_ke_element.offsetTop;
}

function ke_ko_move(e) {
  ke_ko_mouse_x_pos = document.all ? window.event.clientX : e.pageX;
  ke_ko_mouse_y_pos = document.all ? window.event.clientY : e.pageY;
  if (ko_ke_element !== null) {
    ko_ke_element.style.left = ke_ko_mouse_x_pos - ke_ko_x_pos + 'px';
    ko_ke_element.style.top = ke_ko_mouse_y_pos - ke_ko_y_pos + 'px';
  }
}

function ke_ko_destroy() {
  ko_ke_element = null;
}

function ke_ko_showHelp() {
  var html = `<table class="ke-ko-table">
                <thead>                 
                    <tr class="ke-ko-table-header">
                        <th colspan="5">Konsole Commands</th>
                    </tr>
                    <tr class="ke-ko-table-header">
                        <th>Command</th>
                        <th>Parameter(s)</th>
                        <th>Description</th>
                        <th>Restrictions</th>
                        <th>Quick Run</th>
                    </tr>
                </thead>
                <tbody>
                    `;

  html += ke_ko_getHelpTableRow(
    'clear',
    '',
    'clears the konsole output',
    '',
    'clear'
  );
  html += ke_ko_getHelpTableRow(
    'dock',
    'full|right|left|reset',
    'resizes the konsole and docks to the specified location',
    ''
  );

  if (ke_GlobalAdmin) {
    html += ke_ko_getHelpTableRow(
      'eq',
      'list',
      'display the config query list',
      '!',
      'eq list'
    );
    html += ke_ko_getHelpTableRow(
      'eq',
      'mode',
      `execute queries without the eq prefix (type 'exit' to exit)`,
      '!',
      'eq mode'
    );
    html += ke_ko_getHelpTableRow(
      'eq',
      '{key}',
      'execute a query from the config query list',
      '!'
    );
    html += ke_ko_getHelpTableRow('eq', '{query}', 'execute any query', '!');
  }

  html += ke_ko_getHelpTableRow('exit', '', 'hide the konsole', '', 'exit');
  html += ke_ko_getHelpTableRow('F9', '', 'show/hide konsole', '');
  html += ke_ko_getHelpTableRow('help', '', 'your looking at it!', '');
  html += ke_ko_getHelpTableRow('hide', '', 'hide the konsole', '', 'hide');

  html += ke_ko_getHelpTableRow('ls', 'cs *', 'list class schema', '', 'ls cs');
  html += ke_ko_getHelpTableRow(
    'ls',
    'cosh *',
    'list command shortcuts',
    '',
    'ls cosh'
  );
  html += ke_ko_getHelpTableRow(
    'ls',
    'ct *',
    'list custom tables',
    '',
    'ls ct'
  );
  html += ke_ko_getHelpTableRow(
    'ls',
    'dt *',
    'list database tables',
    '',
    'ls dt'
  );
  html += ke_ko_getHelpTableRow(
    'ls',
    'dts *',
    'list database table schema',
    '',
    'ls dts'
  );
  html += ke_ko_getHelpTableRow(
    'ls',
    'endpoints *',
    'list configured endpoint commands',
    '',
    'ls endpoints'
  );
  html += ke_ko_getHelpTableRow('ls', 'fm *', 'list forms', '', 'ls mc');
  html += ke_ko_getHelpTableRow(
    'ls',
    'mc *',
    'list modules classes',
    '',
    'ls mc'
  );
  html += ke_ko_getHelpTableRow(
    'ls',
    'mf *',
    'list media files',
    '50 results max',
    'ls mf'
  );
  html += ke_ko_getHelpTableRow('ls', 'pt *', 'list page types', '', 'ls pt');
  html += ke_ko_getHelpTableRow('ls', 'rp *', 'list reports', '', 'ls rp');
  html += ke_ko_getHelpTableRow('ls', 'si *', 'list sites', '', 'ls si');
  html += ke_ko_getHelpTableRow('ls', 'sk *', 'list setting keys', '', 'ls sk');
  html += ke_ko_getHelpTableRow('ls', 'td *', 'list tree data', '', 'ls td');

  html += ke_ko_getHelpTableRow(
    'matrix',
    '',
    'matrix animation (Esc exits)',
    '',
    'matrix'
  );

  html +=
    `</tbody>
                <tfoot>
                    <tr class="ke-ko-table-header">
                        <td colspan="5">` +
    (ke_GlobalAdmin
      ? `
                            ! Global Admins only<br>`
      : ``) +
    `
                            * A wildcard parameter to filter results based on 'contains' match<br>
                            ls commands that return table results support -[column] [value] filtering<br>
                        </td>
                    </tr>
                </tfoot>
                </table >`;
  ke_ko_commandComplete(html);
}

function ke_ko_getHelpTableRow(
  command,
  params,
  description,
  restrictions,
  commandLink
) {
  return (
    `<tr>
                <td>` +
    command +
    `</td>
                <td>` +
    params +
    `</td>
                <td>` +
    description +
    `</td>
                <td>` +
    restrictions +
    `</td>` +
    (commandLink === undefined || commandLink === ''
      ? `<td>&nbsp;</td>`
      : `<td><a href="#" onclick="ke_ko_runCommand('` +
        commandLink +
        `');return false;">` +
        commandLink +
        `</a></td>`) +
    `</tr>`
  );
}

function ke_ko_dock(param) {
  var konsole = document.getElementById('ke-ko');
  var konsoleContent = document.getElementById('ke-ko-content');
  var konsoleInput = document.getElementById('ke-ko-input').value;

  if (param === '') param = konsole.getAttribute('data-dockstatus');

  if (param === 'headerdblclick') {
    if (konsole.getAttribute('data-dockstatus') === 'full') param = 'reset';
    else param = 'full';
  }

  if (konsoleInput === 'dock right' || param === 'right') {
    konsole.style.display = 'inline-block';
    konsole.style.top = '48px';
    konsole.style.left = '';
    konsole.style.right = '0px';
    konsole.style.width = (window.innerWidth - 35) / 2 + 'px';
    konsoleContent.style.height = window.innerHeight - 39 - 48 + 'px';
    konsole.setAttribute('data-dockstatus', 'right');
  }
  if (konsoleInput == 'dock left' || param === 'left') {
    konsole.style.display = 'inline-block';
    konsole.style.top = '48px';
    konsole.style.left = '0px';
    konsole.style.right = '';
    konsole.style.width = (window.innerWidth - 35) / 2 + 'px';
    konsoleContent.style.height = window.innerHeight - 39 - 48 + 'px';
    konsole.setAttribute('data-dockstatus', 'left');
  }
  if (konsoleInput == 'dock full' || param === 'full') {
    konsole.style.display = 'inline-block';
    konsole.style.top = '48px';
    konsole.style.left = '0px';
    konsole.style.right = '';
    konsole.style.width = window.innerWidth - 18 + 'px';
    konsoleContent.style.height = window.innerHeight - 39 - 48 + 'px';
    konsole.setAttribute('data-dockstatus', 'full');
  }

  if (document.getElementById('konsole') !== null) {
    konsole.style.top = '0px';
    konsoleContent.style.height = window.innerHeight - 50 + 'px';
  }

  if (konsoleInput == 'dock reset' || param === 'reset') {
    konsole.style =
      'top: 50px; left: 50px; width: 600px; display: inline-block;';
    konsoleContent.style.height = '300px';
    konsole.setAttribute('data-dockstatus', 'default');
  }
}

function ke_ko_listSites() {
  var qsParams = 'data=sites';
  var refreshData = ke_ko_getRefreshDataParamValue();
  ke_getAPIDataAsync(qsParams, refreshData, ke_ko_sitesCallback, true);
}
function ke_ko_sitesCallback(dataSet) {
  var filteredResults = ke_ko_filterDataset(dataSet);
  var displaySet = [];
  filteredResults.forEach(function (resultItem) {
    var displayItem = new Object();
    displayItem.ID = resultItem.ID;
    displayItem.DisplayName = resultItem.DisplayName;
    displayItem.CodeName = resultItem.CodeName;
    displayItem.Status = resultItem.Status;
    displayItem.AdminDomain = resultItem.AdminDomain;
    displayItem.URL =
      `<a target="_blank" href="` +
      resultItem.URL +
      `">` +
      resultItem.URL +
      `</a>`;
    displaySet.push(displayItem);
  });
  ke_ko_displayResultsTable(displaySet);
  return;
}

function ke_ko_listPageTypes() {
  var qsParams = 'data=pagetypes';
  var refreshData = ke_ko_getRefreshDataParamValue();
  ke_getAPIDataAsync(qsParams, refreshData, ke_ko_pageTypesCallback, true);
}

function ke_ko_pageTypesCallback(dataSet) {
  var filteredResults = ke_ko_filterDataset(dataSet);
  var displaySet = [];
  filteredResults.forEach(function (resultItem) {
    var displayItem = new Object();
    displayItem.DisplayName =
      `<a href="` +
      resultItem.ClassURL +
      `" target="_blank">` +
      resultItem.DisplayName +
      `</a>`;
    displayItem.CodeName = resultItem.CodeName;
    displayItem.TableName = resultItem.TableName;

    displayItem.InheritsFrom = '&nbsp;';
    if (resultItem.InheritedClassID !== null)
      displayItem.InheritsFrom =
        `<a href="#" onclick="ke_ko_runCommand('ls pt ` +
        resultItem.InheritedCodeName +
        `');return false;">` +
        resultItem.InheritedCodeName +
        `</a>`;

    displayItem.SiteIDs = '&nbsp;';
    if (resultItem.SiteIDs !== null) displayItem.SiteIDs = resultItem.SiteIDs;

    displayItem.Schemas =
      `<a href="#" onclick="ke_ko_databaseTableSchemaClick('` +
      resultItem.TableName +
      `');return false;">Database</a>` +
      ` | <a href="#" onclick="ke_ko_classSchemaClick('` +
      resultItem.CodeName +
      `');return false;">Class</a>`;
    displaySet.push(displayItem);
  });
  ke_ko_displayResultsTable(displaySet);
  return;
}

function ke_ko_listCustomTables() {
  var qsParams = 'data=customtables';
  var refreshData = ke_ko_getRefreshDataParamValue();
  ke_getAPIDataAsync(qsParams, refreshData, ke_ko_customTablesCallback, true);
}
function ke_ko_customTablesCallback(dataSet) {
  var filteredResults = ke_ko_filterDataset(dataSet);
  var displaySet = [];
  filteredResults.forEach(function (resultItem) {
    var displayItem = new Object();
    displayItem.DisplayName = resultItem.DisplayName;
    displayItem.CodeName = resultItem.CodeName;
    displayItem.TableName = resultItem.TableName;
    displayItem.SiteIDs =
      resultItem.SiteIDs !== null ? resultItem.SiteIDs : '&nbsp;';
    displayItem.Links =
      `<a href="#" onclick="ke_ko_databaseTableSchemaClick('` +
      resultItem.TableName +
      `');return false;">Table Schema</a>` +
      ` | <a href="#" onclick="ke_ko_classSchemaClick('` +
      resultItem.CodeName +
      `');return false;">Class Schema</a>` +
      ` | ` +
      ke_ko_getCustomTableLink(resultItem.ClassID, 'Edit Table') +
      ` | <a target="_blank" href="/CMSModules/CustomTables/Tools/CustomTable_Data_List.aspx?objectid=` +
      resultItem.ClassID +
      `">Edit Data</a>`;
    displaySet.push(displayItem);
  });
  ke_ko_displayResultsTable(displaySet);
  return;
}

function ke_ko_listModuleClasses() {
  var qsParams = 'data=moduleclasses';
  var refreshData = ke_ko_getRefreshDataParamValue();
  ke_getAPIDataAsync(qsParams, refreshData, ke_ko_moduleClassesCallback, true);
}
function ke_ko_moduleClassesCallback(dataSet) {
  var filteredResults = ke_ko_filterDataset(dataSet);
  var displaySet = [];
  filteredResults.forEach(function (resultItem) {
    var displayItem = new Object();
    displayItem.DisplayName = resultItem.DisplayName;
    displayItem.Name = resultItem.Name;
    displayItem.ClassDisplayName = resultItem.ClassDisplayName;
    displayItem.ClassName = resultItem.ClassName;
    displayItem.ClassTableName = resultItem.ClassTableName;
    displayItem.SiteIDs =
      resultItem.SiteIDs !== null ? resultItem.SiteIDs : '&nbsp;';
    displayItem.Links =
      `<a href="#" onclick="ke_ko_databaseTableSchemaClick('` +
      resultItem.ClassTableName +
      `');return false;">Table Schema</a>` +
      ` | <a href="#" onclick="ke_ko_classSchemaClick('` +
      resultItem.ClassName +
      `');return false;">Class Schema</a>` +
      ` | <a target="_blank" href="/CMSModules/AdminControls/Pages/UIPage.aspx?elementguid=f6dfdcf6-1515-4b50-b16b-78f9e6635005&objectid=` +
      resultItem.ID +
      `">Edit Module</a>` +
      ` | ` +
      ke_ko_getClassLink(resultItem.ClassID, 'Edit Class');
    displaySet.push(displayItem);
  });
  ke_ko_displayResultsTable(displaySet);
  return;
}

function ke_ko_getCustomTableLink(objectID, linkText) {
  return (
    `<a href="/CMSModules/AdminControls/Pages/UIPage.aspx?elementguid=5399424e-1200-40a7-a108-e4e86d238a56&objectid=` +
    objectID +
    `" target="_blank">` +
    linkText +
    `</a>`
  );
}

function ke_ko_getClassLink(objectID, linkText) {
  return (
    `<a href="/CMSModules/AdminControls/Pages/UIPage.aspx?elementguid=f4c97d07-378a-4693-b9dd-00df3a252d68&objectid=` +
    objectID +
    `" target="_blank">` +
    linkText +
    `</a>`
  );
}

function ke_ko_listDatabaseTables() {
  var qsParams = 'data=databasetables';
  var refreshData = ke_ko_getRefreshDataParamValue();
  ke_getAPIDataAsync(qsParams, refreshData, ke_ko_databaseTablesCallback, true);
}
function ke_ko_databaseTablesCallback(dataSet) {
  var filteredResults = ke_ko_filterDataset(dataSet);
  var displaySet = [];
  filteredResults.forEach(function (resultItem) {
    var displayItem = new Object();
    displayItem.TableName = resultItem.TableName;
    displayItem.ClassName = resultItem.ClassName;
    displayItem.Schemas =
      `<a href="#" onclick="ke_ko_databaseTableSchemaClick('` +
      resultItem.TableName +
      `');return false;">Database</a>`;
    if (resultItem.className !== '')
      displayItem.Schemas +=
        ` | <a href="#" onclick="ke_ko_classSchemaClick('` +
        resultItem.ClassName +
        `');return false;">Class</a>`;
    displaySet.push(displayItem);
  });
  ke_ko_displayResultsTable(displaySet);
  return;
}

function ke_ko_listDatabaseTableSchema() {
  var qsParams = 'data=databasetableschema';
  var refreshData = ke_ko_getRefreshDataParamValue();
  ke_getAPIDataAsync(
    qsParams,
    refreshData,
    ke_ko_databaseTableSchemaCallback,
    true
  );
}
function ke_ko_databaseTableSchemaCallback(dataSet) {
  var filteredResults = ke_ko_filterDataset(dataSet);
  ke_ko_displayResultsTable(filteredResults);
  return;
}

function ke_ko_databaseTableSchemaClick(tableName) {
  document.getElementById('ke-ko-input').value = 'ls dts ' + tableName;
  ke_ko_processInput();
}

function ke_ko_listClassSchema() {
  var qsParams = 'data=classschema';
  var refreshData = ke_ko_getRefreshDataParamValue();
  ke_getAPIDataAsync(qsParams, refreshData, ke_ko_classSchemaCallback, true);
}
function ke_ko_classSchemaCallback(dataSet) {
  var filteredResults = ke_ko_filterDataset(dataSet);
  ke_ko_displayResultsTable(filteredResults);
  return;
}

function ke_ko_classSchemaClick(className) {
  document.getElementById('ke-ko-input').value = 'ls cs ' + className;
  ke_ko_processInput();
}

function ke_ko_getInputArgument(position) {
  var inputValue = document.getElementById('ke-ko-input').value;
  var arguments = inputValue.split(' ');
  if (arguments.length > position) {
    return arguments[position].toLowerCase();
  }
  return '';
}

function ke_ko_getRefreshDataParamValue() {
  return ke_ko_getInputParamValue('refresh', false) === '' ? true : false;
}

function ke_ko_getInputParamValue(paramName, defaultValue = null) {
  if (paramName === undefined || paramName.trim() === '') return defaultValue;

  var inputParams = ke_ko_getInputParameters();
  if (inputParams.length === 0) return defaultValue;

  var paramMatches = inputParams.filter((r) => {
    return r.name === paramName;
  });
  if (paramMatches.length !== 1) return defaultValue;

  return paramMatches[0].value;
}

function ke_ko_getInputParameters(input) {
  var inputValue =
    input === undefined ? document.getElementById('ke-ko-input').value : input;
  var params = [];
  if (inputValue === '') return params;

  var paramNames = inputValue.split('-');

  paramNames.forEach(function (item, index) {
    if (index > 0) {
      var paramName =
        item.indexOf(' ') === -1 ? item : item.substr(0, item.indexOf(' '));
      var paramValueStart = item.indexOf(' ') + 1;
      var paramValue = '';
      if (paramValueStart !== 0) {
        var paramValueLength = item.length - paramValueStart;
        paramValue = item.substr(paramValueStart, paramValueLength);
        paramValue = paramValue.trim();
      }
      var param = { name: paramName, value: paramValue };
      params.push(param);
    }
  });
  return params;
}

function ke_ko_getInputWildcard(input) {
  var inputValue =
    input === undefined ? document.getElementById('ke-ko-input').value : input;
  inputValue = inputValue.trim().toLowerCase();
  var inputTokens = inputValue.split(' ');
  if (inputTokens.length < 3 || inputTokens[2].startsWith('-')) return null;

  var wildcardStart = ke_ko_nthIndex(inputValue, ' ', 2) + 1;
  var wildcardEnd =
    inputValue.indexOf('-') !== -1
      ? inputValue.indexOf('-') - 1
      : inputValue.length;
  var wildcard = inputValue.substr(wildcardStart, wildcardEnd - wildcardStart);

  if (wildcard.trim() === '') return null;

  return wildcard;
}

function ke_ko_nthIndex(str, pat, n) {
  var L = str.length,
    i = -1;
  while (n-- && i++ < L) {
    i = str.indexOf(pat, i);
    if (i < 0) break;
  }
  return i;
}

function ke_ko_filterDataset(dataset) {
  var inputParams = ke_ko_getInputParameters();
  var inputParams = inputParams.filter((p) => {
    return p.name !== 'refresh';
  });
  var wildcard = ke_ko_getInputWildcard();

  if (inputParams.length === 0 && wildcard === null) return dataset;

  var filteredDataset = [];
  var addedIndexes = [];
  dataset.forEach(function (record, rowindex) {
    Object.keys(dataset[rowindex]).forEach(function (key) {
      if (record[key] !== null) {
        if (
          wildcard !== null &&
          record[key]
            .toString()
            .toLowerCase()
            .indexOf(wildcard.toLowerCase()) !== -1
        ) {
          if (addedIndexes.includes(rowindex) === false) {
            filteredDataset.push(record);
            addedIndexes.push(rowindex);
          }
        }
        inputParams.forEach(function (param) {
          if (
            key.toLowerCase() === param.name.toLowerCase() &&
            record[key]
              .toString()
              .toLowerCase()
              .indexOf(param.value.toLowerCase()) !== -1
          ) {
            if (addedIndexes.includes(rowindex) === false) {
              filteredDataset.push(record);
              addedIndexes.push(rowindex);
            }
          }
        });
      }
    });
  });
  return filteredDataset;
}

function ke_ko_listSettingKeys() {
  var qsParams = 'data=settingkeys';
  var refreshData = ke_ko_getRefreshDataParamValue();
  ke_getAPIDataAsync(qsParams, refreshData, ke_ko_settingKeysCallback, true);
}

function ke_ko_settingKeysCallback(dataSet) {
  var filteredResults = ke_ko_filterDataset(dataSet);
  var displaySet = [];
  filteredResults.forEach(function (settingKey) {
    var displayItem = new Object();
    displayItem.Name = settingKey.Name;
    displayItem.DisplayName = settingKey.DisplayName;
    if (settingKey.CategoryParentID !== null)
      displayItem.DisplayName =
        `<a target="_blank" href="` +
        ke_CMSSiteURL +
        `CMSModules/Settings/Pages/Keys.aspx?categoryid=` +
        settingKey.CategoryParentID +
        `">` +
        settingKey.DisplayName +
        `</a>`;
    displayItem.Type = settingKey.Type;
    displayItem.Scope = settingKey.Scope;
    displayItem.IsCustom = !settingKey.Name.startsWith('CMS');
    displayItem.Value = settingKey.Value;
    displaySet.push(displayItem);
  });
  ke_ko_displayResultsTable(displaySet);
  return;
}

function ke_ko_listMediaFiles() {
  var qsParams = 'data=mediafiles';
  ke_getAPIDataAsync(qsParams, false, ke_ko_mediaFilesCallback, true);
}

function ke_ko_mediaFilesCallback(dataSet) {
  var filteredResults = ke_ko_filterDataset(dataSet);
  var top50results = filteredResults.slice(0, 50);
  ke_ko_displayResultsTable(top50results);
  return;
}

function ke_ko_listForms() {
  var qsParams = 'data=forms';
  ke_getAPIDataAsync(qsParams, false, ke_ko_formsCallback, true);
}
function ke_ko_formsCallback(dataSet) {
  var filteredResults = ke_ko_filterDataset(dataSet);
  var displaySet = [];
  filteredResults.forEach(function (resultItem) {
    var displayItem = new Object();
    displayItem.ID = resultItem.ID;
    displayItem.DisplayName = resultItem.DisplayName;
    displayItem.CodeName = resultItem.CodeName;
    displayItem.ClassName = resultItem.ClassName;
    displayItem.Site = resultItem.Site;
    displayItem.Records = resultItem.Records;
    displayItem.Links =
      `<a href="#" onclick="ke_ko_databaseTableSchemaClick('` +
      resultItem.TableName +
      `');return false;">Table Schema</a>` +
      ` | <a href="#" onclick="ke_ko_classSchemaClick('` +
      resultItem.ClassName +
      `');return false;">Class Schema</a>` +
      ` | <a target="_blank" href="/CMSModules/AdminControls/Pages/UIPage.aspx?elementguid=0e8d0795-e114-4075-a9f3-226e40bf4207&objectid=` +
      resultItem.ID +
      `">Form Admin</a>`;
    displaySet.push(displayItem);
  });
  ke_ko_displayResultsTable(displaySet);
  return;
}

function ke_ko_listReports() {
  var qsParams = 'data=reports';
  ke_getAPIDataAsync(qsParams, false, ke_ko_reportsCallback, true);
}

function ke_ko_reportsCallback(dataSet) {
  var filteredResults = ke_ko_filterDataset(dataSet);
  var displaySet = [];
  filteredResults.forEach(function (result) {
    var displayItem = new Object();
    displayItem.Category = result.Category;
    displayItem.DisplayName =
      `<a target="_blank" href="` +
      ke_CMSSiteURL +
      `CMSModules/Reporting/Tools/Report_View.aspx?parentobjectid=` +
      result.ReportCategoryID +
      `&reportid=` +
      result.ReportID +
      `&tabslayout=horizontal&objectid=` +
      result.ReportID +
      `">` +
      result.DisplayName +
      `</a>`;
    displayItem.ReportName = result.ReportName;
    displaySet.push(displayItem);
  });
  ke_ko_displayResultsTable(displaySet);
  return;
}

function ke_ko_listTreeData() {
  var qsParams = 'data=treedata';
  ke_getAPIDataAsync(qsParams, false, ke_ko_treeDataCallback, true);
}

function ke_ko_treeDataCallback(dataSet) {
  var filteredResults = ke_ko_filterDataset(dataSet);
  var displaySet = [];
  filteredResults.forEach(function (resultItem) {
    var displayItem = new Object();
    displayItem.DocumentNamePath =
      `<a target="_blank" href="` +
      ke_CMSAdminURL +
      `?action=edit&nodeid=` +
      resultItem.NodeID +
      `&culture=` +
      resultItem.DocumentCulture +
      `#95a82f36-9c40-45f0-86f1-39aa44db9a77">` +
      resultItem.DocumentNamePath +
      `</a>`; // the GUID is the pages ui element identifier
    displayItem.NodeAliasPath =
      `<a target="_blank" href="` +
      ke_PublicSiteURL +
      resultItem.NodeAliasPath.substr(1) +
      `">` +
      resultItem.NodeAliasPath +
      `</a>`;
    displayItem.ClassName =
      `<a href="#" onclick="ke_ko_runCommand('ls pt ` +
      resultItem.ClassName +
      `');return false;">` +
      resultItem.ClassName +
      `</a>`;
    displayItem.DocumentCulture = resultItem.DocumentCulture;
    displayItem.PageTemplateCodeName =
      resultItem.PageTemplateCodeName === null
        ? ' '
        : resultItem.PageTemplateCodeName;
    displayItem.NodeGUID = resultItem.NodeGUID;
    displayItem.DocumentGUID = resultItem.DocumentGUID;
    displaySet.push(displayItem);
  });
  ke_ko_displayResultsTable(displaySet);
  return;
}

function ke_ko_listConfigQueries() {
  if (
    kb_ko_config === null ||
    kb_ko_config.Config === undefined ||
    kb_ko_config.Config.queries === undefined ||
    kb_ko_config.Config.queries.length === 0
  ) {
    html =
      '<br>Konsole configuration does not contain any configured queries<br>';
    ke_ko_commandComplete(html);
    return;
  }
  var filteredResults = ke_ko_filterDataset(kb_ko_config.Config.queries);
  ke_ko_displayResultsTable(filteredResults);
  return;
}

function ke_ko_executeQueryMode(enabled) {
  ke_ko_commandComplete();

  var kekoLabel = document.getElementById('ke-ko-label');
  kekoLabel.innerHTML = enabled ? 'eq>' : 'ke>';

  if (enabled && kekoLabel.classList.contains('ke-ko-eq-mode') === false)
    kekoLabel.classList.add('ke-ko-eq-mode');
  if (
    enabled === false &&
    kekoLabel.classList.contains('ke-ko-eq-mode') === true
  )
    kekoLabel.classList.remove('ke-ko-eq-mode');

  var kekoInput = document.getElementById('ke-ko-input');
  if (enabled && kekoInput.classList.contains('ke-ko-eq-mode') === false)
    kekoInput.classList.add('ke-ko-eq-mode');
  if (
    enabled === false &&
    kekoInput.classList.contains('ke-ko-eq-mode') === true
  )
    kekoInput.classList.remove('ke-ko-eq-mode');
}

function ke_ko_listEndpoints() {
  if (
    kb_ko_config === null ||
    kb_ko_config.Config === undefined ||
    kb_ko_config.Config.endpoints === undefined ||
    kb_ko_config.Config.endpoints.length === 0
  ) {
    html =
      '<br>Konsole configuration does not contain any configured endpoints<br>';
    ke_ko_commandComplete(html);
    return;
  }

  var filteredResults = ke_ko_filterDataset(kb_ko_config.Config.endpoints);
  var displaySet = [];
  filteredResults.forEach(function (resultItem) {
    var displayItem = new Object();
    displayItem.Command = resultItem.command;
    displayItem.Parameters =
      resultItem.parameters === undefined ? ' ' : resultItem.parameters;
    displayItem.Description =
      resultItem.description === undefined ? ' ' : resultItem.description;
    displayItem.Restriction =
      resultItem.restriction === undefined ? ' ' : resultItem.restriction;
    displayItem.QuickRun =
      `<a href="#" onclick="ke_ko_runCommand('` +
      resultItem.command +
      `');return false;">` +
      resultItem.command +
      `</a>`;
    displaySet.push(displayItem);
  });
  ke_ko_displayResultsTable(displaySet);
  return;
}

function ke_ko_listCommandShortcuts() {
  if (
    kb_ko_config === null ||
    kb_ko_config.Config === undefined ||
    kb_ko_config.Config.commandShortcuts === undefined ||
    kb_ko_config.Config.commandShortcuts.length === 0
  ) {
    html =
      '<br>Konsole configuration does not contain any configured command shortcuts<br>';
    ke_ko_commandComplete(html);
    return;
  }

  var filteredResults = ke_ko_filterDataset(
    kb_ko_config.Config.commandShortcuts
  );
  var displaySet = [];
  filteredResults.forEach(function (resultItem) {
    var displayItem = new Object();
    displayItem.Shortcut = resultItem.shortcut;
    displayItem.Command = resultItem.command;
    displayItem.QuickRun =
      `<a href="#" onclick="ke_ko_runCommand('` +
      resultItem.command +
      `');return false;">` +
      resultItem.command +
      `</a>`;
    displaySet.push(displayItem);
  });
  ke_ko_displayResultsTable(displaySet);
  return;
}

function ke_ko_executeQuery() {
  var inputValue = document.getElementById('ke-ko-input').value;
  var query = ke_ko_eqMode() ? inputValue : inputValue.substr(3);

  if (
    kb_ko_config !== null &&
    kb_ko_config.Config !== undefined &&
    kb_ko_config.Config.queries !== undefined
  ) {
    var configQuery = kb_ko_config.Config.queries.filter((r) => {
      return r.key === query;
    })[0];
    if (configQuery !== undefined && configQuery.query !== null) {
      query = configQuery.query;
    }
  }

  if (
    query.indexOf(' -verified') === -1 &&
    (query.toLowerCase().indexOf('delete') !== -1 ||
      query.toLowerCase().indexOf('drop') !== -1 ||
      query.toLowerCase().indexOf('truncate') !== -1 ||
      query.toLowerCase().indexOf('alter') !== -1 ||
      query.toLowerCase().indexOf('modify') !== -1 ||
      query.toLowerCase().indexOf('create') !== -1 ||
      query.toLowerCase().indexOf('insert') !== -1 ||
      query.toLowerCase().indexOf('update') !== -1)
  ) {
    ke_ko_commandComplete(
      "<br><span style='color: red'>This command contains high risk keywords. Append -verified to the end of the command to execute.</span>"
    );
    document.getElementById('ke-ko-input').value = inputValue;
    return;
  }

  if (query.indexOf(' -verified') !== -1) {
    query = query.replace(' -verified', '');
  }

  var qsParams = 'data=executequery';
  ke_postAPIDataAsync(qsParams, true, ke_ko_displayResultsTable, true, query);
}

function ke_ko_displayResultsTable(queryResults) {
  var html = '';
  if (typeof queryResults === 'string') {
    html =
      `<table class="ke-ko-table">
                    <tbody>                    
                        <tr class="ke-ko-table-header">
                            <td>Result</td>
                        </tr>
                        <tr>
                            <td>` +
      queryResults.replaceAll('\r\n', '<br>') +
      `</td>
                        </tr>
                    <tbody>
                </table>`;
    html += ' 0 records returned.<br>';
    ke_ko_commandComplete(html);
    return;
  }

  var html = `<table class="ke-ko-table">
                <thead>                    
                    <tr class="ke-ko-table-header">`;
  if (queryResults.length !== 0) {
    for (var i = 0; i < Object.keys(queryResults[0]).length; i++) {
      var colHeading = Object.keys(queryResults[0])[i];
      html += `<th>` + colHeading + `</th>`;
    }
  } else {
    html += `<th>Results</th>`;
  }
  html += `       </tr>
                </thead>
                <tbody>`;

  var itemCount = 0;
  var cellValue = '';
  for (var i = 0; i < queryResults.length; i++) {
    row = queryResults[i];
    html += `<tr>`;
    for (var r = 0; r < Object.keys(queryResults[i]).length; r++) {
      cellValue = queryResults[i][Object.keys(queryResults[i])[r]];
      if (
        cellValue !== null &&
        typeof cellValue === 'string' &&
        cellValue.startsWith('<a ') === false &&
        (cellValue.length > 100 ||
          cellValue.match(/\r/g) !== null ||
          cellValue.match(/\n/g) !== null)
      )
        html +=
          `<td><textarea class="ko-text-area narrow">` +
          cellValue +
          `</textarea></td>`;
      else
        html += `<td>` + (cellValue === null ? `&nbsp;` : cellValue) + `</td>`;
    }
    html += `</tr>`;

    itemCount++;
  }

  if (queryResults.length === 0) {
    html += `<td>No results</td>`;
  }

  html += `</tbody>
            </table>`;

  if (queryResults.length === 0) {
    html += ' 0 records returned.<br>';
  } else {
    html += ' ' + itemCount + ' record(s) returned.<br>';
  }

  ke_ko_commandComplete(html);
}

function ke_ko_showMatrix() {
  ke_ko_loadMatrix();
  var konsoleMatrix = document.getElementById('ke-ko-matrix');
  konsoleMatrix.height = document.getElementById('ke-ko-content').offsetHeight;
  konsoleMatrix.width = document.getElementById('ke-ko-header').offsetWidth;
  document.getElementById('ke-ko-content').style.display = 'none';
  document.getElementById('ke-ko-matrix').style.display = 'block';
}

function ke_ko_hideMatrix() {
  if (ke_ko_matrixLoaded == true && document.hasFocus()) {
    document.getElementById('ke-ko-content').style.display = '';
    document.getElementById('ke-ko-matrix').style.display = 'none';
    document.getElementById('ke-ko-input').focus();
  }
}

function ke_ko_loadMatrix() {
  ke_ko_matrixLoaded = true;
  var c = document.getElementById('ke-ko-matrix');
  var ctx = c.getContext('2d');

  c.height = document.getElementById('ke-ko-content').offsetHeight;
  c.width = document.getElementById('ke-ko-header').offsetWidth;

  var customtext = ' K3NtIc0 ExT3n5i0Ns k0n50L3 ';
  var customtextarr = customtext.split('');
  var customtextlength = customtextarr.length;

  var font_size = 10;
  var columns = c.width / font_size;
  var drops = [];

  for (var x = 0; x < columns; x++) drops[x] = 1;

  var drawCount = 1;
  var startchars = [];

  for (var i = 0; i < drops.length; i++) {
    var randomstartchar = Math.floor(Math.random() * customtext.length);
    startchars.push(randomstartchar);
  }

  var matrixIntervalID = setInterval(ke_ko_draw, 0);

  function ke_ko_draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, c.width, c.height);

    if (drawCount < 100) ctx.fillStyle = '#000';
    else ctx.fillStyle = '#0F0';

    ctx.font = font_size + 'px arial';

    var offset = 0;
    var curchar = 0;
    var sum = 0;

    for (var i = 0; i < drops.length; i++) {
      offset = drawCount % customtextlength;
      sum = startchars[i] + offset;
      if (sum >= customtextlength) curchar = sum - customtextlength;
      else curchar = sum;

      var text = customtextarr[curchar];

      ctx.fillText(text, i * font_size, drops[i] * font_size);

      if (drops[i] * font_size > c.height && Math.random() > 0.975)
        drops[i] = 0;

      drops[i]++;
    }
    drawCount++;

    if (drawCount == 100) {
      clearInterval(matrixIntervalID);
      matrixIntervalID = setInterval(ke_ko_draw, 80);
    }
  }
}
