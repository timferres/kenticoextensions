(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };

  // src/infrastructure/config.js
  var ke_CMSSiteURL = window.location.origin + "/";
  var ke_CMSAdminURL = ke_CMSSiteURL + "admin/cmsadministration.aspx";
  var ke_PublicSiteURL = ke_CMSSiteURL.replace("cms", "site");
  var ke_APIURL = ke_CMSSiteURL + "kenticoextensions/api.ashx";
  var config = {
    EnabledUserNames: [],
    DisabledUserNames: [],
    Enabled: false,
    ConsoleLogging: false,
    CacheListRefreshFrequency: 1e4,
    Extensions: [],
    siteURL: ke_CMSSiteURL,
    adminURL: ke_CMSAdminURL,
    publicSiteURL: ke_PublicSiteURL,
    apiURL: ke_APIURL
  };
  function getAppConfig() {
    return __spreadValues({}, config);
  }
  function setAppConfig(newConfig) {
    config.Enabled = newConfig.Enabled;
    config.ConsoleLogging = newConfig.ConsoleLogging || config.ConsoleLogging;
    config.CacheListRefreshFrequency = newConfig.CacheListRefreshFrequency || config.CacheListRefreshFrequency;
    config.EnabledUserNames = newConfig.EnabledUserNames || config.EnabledUserNames;
    config.DisabledUserNames = newConfig.DisabledUserNames || config.DisabledUserNames;
    config.Extensions = newConfig.Extensions || config.Extensions;
  }
  function getExtensionConfig(code) {
    return config.Extensions.find((e) => e.Code === code) || {};
  }

  // src/auth/session.js
  var userInfo = {
    id: 0,
    guid: "00000000-0000-0000-0000-000000000000",
    username: "",
    globalAdmin: false
  };
  function isCurrentSessionEnabled() {
    const { EnabledUserNames, DisabledUserNames } = getAppConfig();
    return userInfo.username && (!EnabledUserNames.length || EnabledUserNames.includes(userInfo.username)) && !DisabledUserNames.includes(userInfo.username);
  }
  function getCurrentSession() {
    return __spreadValues({}, userInfo);
  }
  function setCurrentSession(info) {
    userInfo.guid = info.guid;
    userInfo.id = info.id;
    userInfo.username = info.username;
    userInfo.globalAdmin = info.globalAdmin;
  }

  // src/infrastructure/api.js
  function get(queryParams, refreshData) {
    const { apiURL } = getAppConfig();
    var params = new URLSearchParams();
    for (const key in queryParams) {
      if (Object.hasOwnProperty.call(queryParams, key)) {
        params.append(key, queryParams[key]);
      }
    }
    if (refreshData) {
      params.append("refreshdata", true);
    }
    const requestURL = Array.from(params.entries()).length ? `${apiURL}?${params.toString()}` : apiURL;
    return fetch(requestURL, { method: "GET" }).then((resp) => resp.json()).then((resp) => resp.Data);
  }

  // src/utilities/dom.js
  function isCMSRootIFrame() {
    return document.querySelector(".CMSDeskContent");
  }
  function isContentTree() {
    return document.querySelector(".ContentTree");
  }
  function contenTree() {
    return document.querySelector(".TreeAreaTree");
  }

  // src/utilities/url.js
  function getQueryStringValue(name, url) {
    if (!url) {
      url = window.location.href;
    }
    const urlobj = getURL(url);
    if (!urlobj) {
      return null;
    }
    const urlsearch = urlobj.search;
    const params = new URLSearchParams(urlsearch);
    return params.get(name);
  }
  function getURL(value) {
    try {
      if (value.startsWith("http")) {
        return new URL(value);
      }
      return new URL(value, document.baseURI);
    } catch (_) {
      return null;
    }
  }
  function isLoginPage() {
    return window.location.href.includes("/CMSPages/logon.aspx");
  }
  function isPageInfoFrame() {
    return window.location.href.includes("/CMSModules/AdminControls/Pages/UIPage.aspx");
  }
  function isCMSDeskFrame() {
    return window.location.href.includes("/CMSModules/Content/CMSDesk/Default.aspx");
  }
  function isCMSDashboard() {
    return window.location.href.includes("/CMSModules/ApplicationDashboard/ApplicationDashboard.aspx");
  }
  function isStagingFrame() {
    return window.location.href.includes("/CMSModules/Staging/Tools/AllTasks/Tasks.aspx") || window.location.href.includes("/CMSModules/Staging/Tools/Tasks/Tasks.aspx") || window.location.href.includes("/CMSModules/Staging/Tools/Objects/Tasks.aspx") || window.location.href.includes("/CMSModules/Staging/Tools/Data/Tasks.aspx");
  }

  // src/plugins/environments-bar.js
  function initialize() {
    const masterContainer = isCMSRootIFrame();
    if (!masterContainer) {
      return;
    }
    const extConfig = getExtensionConfig("eb");
    if (!extConfig.Enabled || !extConfig.Config) {
      return;
    }
    const envConfig = getCurrentEnvironmentConfig(extConfig);
    if (!envConfig) {
      return;
    }
    const envbar = document.createElement("div");
    envbar.id = "ke-eb";
    envbar.className = "ke-eb fullwidth";
    envbar.style.backgroundColor = envConfig.Color;
    masterContainer.parentNode.insertBefore(envbar, masterContainer);
    const envbarlabel = document.createElement("div");
    envbarlabel.id = "ke-eb label";
    envbarlabel.className = "ke-eb label";
    envbarlabel.style.backgroundColor = envConfig.Color;
    envbarlabel.innerHTML = `<span>${envConfig.Label}</span>`;
    masterContainer.parentNode.insertBefore(envbarlabel, masterContainer);
    document.title = `${envConfig.Label}-${document.title}`;
  }
  function getCurrentEnvironmentConfig(extensionConfig) {
    const envConfig = extensionConfig.Config;
    const currentURL = window.location.hostname;
    for (let i = 0; i < envConfig.Environments.length; i++) {
      const configURL = envConfig.Environments[i].URL;
      if (configURL === currentURL) {
        return envConfig.Environments[i];
      }
      if (configURL.length > 1 && !configURL.startsWith("*") && configURL.endsWith("*") && currentURL.startsWith(configURL.substr(0, configURL.length - 1)) === true) {
        return envConfig.Environments[i];
      }
      if (configURL.length > 1 && configURL.startsWith("*") && !configURL.endsWith("*") && currentURL.endsWith(configURL.substr(1)) === true) {
        return envConfig.Environments[i];
      }
      if (configURL.length > 2 && configURL.startsWith("*") && configURL.endsWith("*") && currentURL.indexOf(configURL.substr(1, configURL.length - 2)) !== -1) {
        return envConfig.Environments[i];
      }
    }
  }

  // src/utilities/formatting.js
  function ke_getISODateTimeString(date, format) {
    var cdt = new Date(date);
    var hours = cdt.getHours();
    var ampm = cdt.getHours() >= 12 ? "PM" : "AM";
    if (format = "12") {
      var hours = hours % 12;
      hours = hours ? hours : 12;
    }
    var cdts = cdt.getFullYear() + "-" + ("0" + (cdt.getMonth() + 1)).slice(-2) + "-" + ("0" + cdt.getDate()).slice(-2) + " " + ("0" + hours).slice(-2) + ":" + ("0" + cdt.getMinutes()).slice(-2) + ":" + ("0" + cdt.getSeconds()).slice(-2);
    if (format = "12") {
      cdts += " " + ampm;
    }
    return cdts;
  }
  function ke_getCurrentDateTimeString() {
    var cdt = new Date();
    var cdts = cdt.getUTCFullYear() + "-" + ("0" + (cdt.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + cdt.getUTCDate()).slice(-2) + " " + ("0" + cdt.getUTCHours()).slice(-2) + ":" + ("0" + cdt.getUTCMinutes()).slice(-2) + ":" + ("0" + cdt.getUTCSeconds()).slice(-2);
    return cdts;
  }
  function ke_formatBytes(bytes) {
    if (bytes >= 1e9) {
      bytes = (bytes / 1e9).toFixed(2) + " GB";
    } else if (bytes >= 1e6) {
      bytes = (bytes / 1e6).toFixed(2) + " MB";
    } else if (bytes >= 1e3) {
      bytes = (bytes / 1e3).toFixed(0) + " KB";
    } else if (bytes > 1) {
      bytes = bytes + " bytes";
    } else if (bytes == 1) {
      bytes = bytes + " byte";
    } else {
      bytes = "0 byte";
    }
    return bytes;
  }

  // src/plugins/document-information.js
  async function initialize2() {
    if (!isPageInfoFrame()) {
      return;
    }
    const allNavTabs = document.querySelectorAll(".nav-tabs");
    if (!allNavTabs.length) {
      return;
    }
    const extConfig = getExtensionConfig("di");
    if (!extConfig.Enabled) {
      return;
    }
    const nodeid = getQueryStringValue("nodeid");
    if (nodeid == null || nodeid == "") {
      return;
    }
    const docItems = await get({ data: "documentinfo", nodeid });
    if (docItems.length < 1) {
      return;
    }
    const [navTabs] = allNavTabs;
    const [docItem] = docItems;
    const dateTimeString = ke_getISODateTimeString(docItem.DocumentModifiedWhen, "12");
    const infoDiv = document.createElement("div");
    infoDiv.id = `ke_di_node_${docItem.NodeID}`;
    infoDiv.className = "ke-di-info-div";
    infoDiv.innerHTML = `<strong>Last modified:</strong> ${docItem.DocumentModifiedBy} (${dateTimeString}) | <a href="${docItem.AbsolutePath}" target="_blank">Live Version</a><br />`;
    navTabs.appendChild(infoDiv);
  }

  // src/plugins/tree-information.js
  var treeItems = [];
  var treeItemsLookup = {};
  async function initialize3() {
    if (!isCMSDeskFrame() || !isContentTree()) {
      return;
    }
    const extConfig = getExtensionConfig("ti");
    if (!extConfig?.Enabled) {
      return;
    }
    const mutationObserver = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0 && mutation.addedNodes[0].className != "ke-ti-info-div") {
          setupInfoPanels();
        }
      }
    });
    mutationObserver.observe(contenTree(), {
      childList: true,
      subtree: true
    });
    treeItems = await get({ data: "treeinfo" });
    treeItemsLookup = treeItems.reduce((prev, curr) => {
      prev[curr.NodeID] = curr;
      return prev;
    }, {});
    setupInfoPanels();
  }
  function setupInfoPanels() {
    const spanElements = document.querySelectorAll("span[id^='target_']");
    const bodyElement = document.querySelector("body");
    for (const span of spanElements) {
      const parentElement = span.parentNode;
      const nodeID = span.id.replace("target_", "");
      const treeItem = treeItemsLookup[nodeID];
      if (!treeItem) {
        continue;
      }
      const currentDiv = document.querySelector(`#ke_ti_node_${nodeID}`);
      let infoDiv = currentDiv ?? createInfoPanel(treeItem);
      infoDiv.onmouseover = function() {
        this.style.display = "block";
      };
      infoDiv.onmouseout = function() {
        this.style.display = "none";
      };
      bodyElement.appendChild(infoDiv);
      parentElement.onmouseover = function() {
        const elementArray = document.querySelectorAll(".ke-ti-info-div");
        for (const el of document.querySelectorAll(".ke-ti-info-div")) {
          el.style.display = "none";
        }
        const spanElement = this.firstElementChild;
        const nodeID2 = spanElement.id.replace("target_", "");
        const infoDiv2 = document.querySelector("#ke_ti_node_" + nodeID2);
        const clientHeight = document.querySelector(`#node_${nodeID2}`).clientHeight;
        const contentTreeSplitterRect = document.querySelectorAll(".ui-layout-resizer-west")[0].getBoundingClientRect();
        infoDiv2.style.top = contentTreeSplitterRect.bottom - 125 - 30 + "px";
        infoDiv2.style.left = contentTreeSplitterRect.right + 10 + "px";
        infoDiv2.style.display = "";
      };
      parentElement.onmouseout = function() {
        const nodeID2 = this.firstElementChild.id.replace("target_", "");
        setTimeout(function() {
          if (document.querySelector("#ke_ti_node_" + nodeID2).style.display == "") {
            document.querySelector("#ke_ti_node_" + nodeID2).style.display = "none";
          }
        }, 3e3);
      };
    }
  }
  function createInfoPanel(treeItem) {
    const infoEl = document.createElement("div");
    infoEl.id = `ke_ti_node_${treeItem.NodeID}`;
    infoEl.className = "ke-ti-info-div";
    infoEl.style.display = "none";
    infoEl.innerHTML = `<strong>Node Name:</strong> ${treeItem.NodeName}<br />
<strong>Node ID:</strong> ${treeItem.NodeID}<br />
<strong>Node GUID:</strong> ${treeItem.NodeGUID}<br />
<strong>Node Alias Path:</strong>
<a target='_blank' href='${treeItem.AbsolutePath}'>${treeItem.NodeAliasPath}</a><br />
<strong>Page Type:</strong> ${treeItem.ClassDisplayName} [${treeItem.ClassName}]<br />
<strong>Page Template:</strong> ${treeItem.PageTemplateDisplayName} [${treeItem.PageTemplateCodeName}]`;
    return infoEl;
  }

  // src/plugins/staging-tasks.js
  var ke_stuf_initalised = false;
  var ke_stuf_userColumnLoaded = false;
  var ke_stuf_userFilterLoaded = false;
  async function initialize4() {
    if (ke_stuf_initalised) {
      return;
    }
    if (!isStagingFrame()) {
      return;
    }
    const extConfig = getExtensionConfig("stuf");
    if (!extConfig?.Enabled) {
      return;
    }
    await ke_stuf_initUserColumn();
    await ke_stuf_initUserFilter();
    ke_stuf_addSelectAllCheckBox();
    Sys.WebForms.PageRequestManager.getInstance().add_endRequest(ke_stuf_endRequestHandler);
    ke_stuf_initalised = true;
  }
  async function ke_stuf_initUserColumn() {
    const serverSelect = document.querySelectorAll("select[id$='drpSingleSelect']")[0];
    const serverid = serverSelect.options[serverSelect.selectedIndex].value;
    const task = await get({ data: "stagingtasks", serverid });
    await ke_stuf_addUserColumn(task);
  }
  async function ke_stuf_addUserColumn(taskData) {
    const taskTable = document.querySelector("table[id^='m_c_']");
    const taskTitleCol = taskTable.querySelectorAll("th")[2];
    const headerCol = document.createElement("th");
    headerCol.innerHTML = "User";
    taskTitleCol.insertAdjacentElement("afterend", headerCol);
    const [_, ...taskTableRows] = taskTable.querySelectorAll("tr");
    let currentTaskID = 0;
    let titleCol;
    let currentInput;
    for (const row of taskTableRows) {
      currentInput = row.querySelectorAll("input")[0];
      currentTaskID = currentInput.getAttribute("data-arg");
      currentTaskID = Number(currentTaskID);
      titleCol = row.querySelectorAll("td")[2];
      const taskRecord = await ke_stuf_getTaskByTaskID(taskData, currentTaskID);
      const userCol = document.createElement("td");
      if (!taskRecord) {
        userCol.innerHTML = "&nbsp;";
        titleCol.insertAdjacentElement("afterend", userCol);
        currentInput.setAttribute("data-useridlist", 0);
        row.setAttribute("data-useridlist", 0);
      } else {
        userCol.innerHTML = taskRecord.UserFullNameList;
        titleCol.insertAdjacentElement("afterend", userCol);
        currentInput.setAttribute("data-useridlist", taskRecord.UserIDList);
        row.setAttribute("data-useridlist", taskRecord.UserIDList);
      }
    }
    ke_stuf_userColumnLoaded = true;
    ke_stuf_refreshFilter();
  }
  async function ke_stuf_getTaskByTaskID(taskData, taskID) {
    taskData.find((d) => d.TaskID === taskID);
  }
  async function ke_stuf_initUserFilter() {
    const serverSelect = document.querySelectorAll("select[id$='drpSingleSelect']")[0];
    const serverid = serverSelect.options[serverSelect.selectedIndex].value;
    const userData = await get({ data: "stagingusers", serverid });
    ke_stuf_addUserFilter(userData);
  }
  function ke_stuf_addUserFilter(userData) {
    const panelContainer = document.getElementById("m_pnlContainer");
    if (panelContainer === null) {
      return;
    }
    const userPanel = document.createElement("div");
    userPanel.id = "m_pnlUserSelector";
    userPanel.className = "header-panel";
    userPanel.style = "padding: 8px 16px 8px 16px";
    const userFilterContainer = document.createElement("div");
    userFilterContainer.className = "form-horizontal form-filter user-selector ke-stuf-filter-container";
    userFilterContainer.style = "float: right";
    const userLabel = document.createElement("div");
    userLabel.className = "filter-form-label-cell";
    userLabel.innerHTML = '<span id="usersLabel" class="control-label">User:</span>';
    const userFilter = document.createElement("div");
    userFilter.className = "filter-form-value-cell-wide";
    const userSelect = document.createElement("select");
    userSelect.id = "kentico-extensions-user-filter";
    userSelect.className = "DropDownField form-control";
    const optAll = document.createElement("option");
    optAll.value = 0;
    optAll.innerHTML = "All";
    userSelect.appendChild(optAll);
    for (const user of userData) {
      const opt = document.createElement("option");
      opt.value = user.UserID;
      opt.innerHTML = user.UserFullName;
      userSelect.appendChild(opt);
    }
    userFilter.appendChild(userSelect);
    userFilterContainer.appendChild(userLabel);
    userFilterContainer.appendChild(userFilter);
    userPanel.appendChild(userFilterContainer);
    const actionsPanel = document.createElement("div");
    actionsPanel.id = "m_pnlActions";
    actionsPanel.className = "cms-edit-menu";
    if (document.getElementById("m_pnlActions") === null) {
      panelContainer.appendChild(actionsPanel);
    }
    panelContainer.appendChild(userPanel);
    userSelect.addEventListener("change", ke_stuf_applyFilter, false);
    ke_stuf_userFilterLoaded = true;
    const contentPanel = document.getElementById("m_pnlContent");
    if (contentPanel === null) {
      return;
    }
    contentPanel.style = "margin-top: 28px";
  }
  function ke_stuf_addSelectAllCheckBox() {
    const kenticoSelectAllCheckbox = document.querySelector("input[id$='headerBox']");
    if (kenticoSelectAllCheckbox == null) {
      return;
    }
    const customSelectAllCheckbox = document.createElement("input");
    customSelectAllCheckbox.id = "kentico-extensions-select-all";
    customSelectAllCheckbox.type = "checkbox";
    customSelectAllCheckbox.disabled = true;
    customSelectAllCheckbox.addEventListener("click", ke_stuf_selectAll, false);
    const customSelectAllCheckboxLabel = document.createElement("label");
    customSelectAllCheckboxLabel.id = "kentico-extensions-select-all-label";
    customSelectAllCheckboxLabel.htmlFor = "kentico-extensions-select-all";
    customSelectAllCheckboxLabel.style.display = "none";
    customSelectAllCheckboxLabel.innerHTML = "&nbsp;";
    kenticoSelectAllCheckbox.parentNode.insertBefore(customSelectAllCheckbox, kenticoSelectAllCheckbox);
    kenticoSelectAllCheckbox.parentNode.insertBefore(customSelectAllCheckboxLabel, kenticoSelectAllCheckbox);
  }
  function ke_stuf_refreshFilter() {
    if (ke_stuf_userFilterLoaded && ke_stuf_userColumnLoaded) {
      ke_stuf_applyFilter();
    }
  }
  function ke_stuf_applyFilter() {
    const userSelect = document.querySelector("#kentico-extensions-user-filter");
    const selectedUserID = userSelect.selectedOptions[0].value;
    if (selectedUserID != 0) {
      document.querySelector("input[id$='headerBox']").checked = false;
      document.querySelector("input[id$='headerBox']").disabled = true;
      document.querySelector('label[for*="headerBox"').style.display = "none";
      document.querySelector("#kentico-extensions-select-all").disabled = false;
      document.querySelector("#kentico-extensions-select-all-label").style.display = "";
      document.querySelector("#m_c_btnSyncAll").disabled = true;
      document.querySelector("#m_c_btnDeleteAll").disabled = true;
    } else {
      document.querySelector("input[id$='headerBox']").disabled = false;
      document.querySelector('label[for*="headerBox"').style.display = "";
      document.querySelector("#kentico-extensions-select-all").disabled = true;
      document.querySelector("#kentico-extensions-select-all-label").style.display = "none";
      document.querySelector("#m_c_btnSyncAll").disabled = false;
      document.querySelector("#m_c_btnDeleteAll").disabled = false;
    }
    const taskTable = document.querySelector("table[id^='m_c_']");
    const [_, ...taskTableRows] = taskTable.querySelectorAll("tr");
    let visibleRows = 0;
    let selectedRows = 0;
    for (const row of taskTableRows) {
      const currentUserIDList = row.getAttribute("data-useridlist");
      if (!currentUserIDList) {
        continue;
      }
      const currentInput = row.getElementsByTagName("input")[0];
      if (currentUserIDList.includes(`|${selectedUserID}|`)) {
        row.style = "display: table-row;";
        visibleRows++;
      } else if (selectedUserID === "0") {
        row.style = "display: table-row;";
        visibleRows++;
      } else {
        row.style = "display: none;";
        if (currentInput.checked) {
          currentInput.dispatchEvent(new MouseEvent("click"));
        }
      }
      if (currentInput.checked) {
        selectedRows++;
      }
    }
    if (visibleRows === selectedRows) {
      document.querySelector("#kentico-extensions-select-all").checked = true;
    } else {
      document.querySelector("#kentico-extensions-select-all").checked = false;
    }
  }
  async function ke_stuf_endRequestHandler(sender, args) {
    await ke_stuf_initUserColumn();
    ke_stuf_addSelectAllCheckBox();
    ke_stuf_refreshFilter();
  }
  function ke_stuf_selectAll() {
    const selectAll = document.querySelector("#kentico-extensions-select-all").checked;
    const userSelect = document.querySelector("#kentico-extensions-user-filter");
    const selectedUserID = parseInt(userSelect.selectedOptions[0].value, 10);
    const taskTable = document.querySelector("table[id^='m_c_']");
    const taskTableRows = taskTable.querySelectorAll("tr");
    let currentUserID = 0;
    let currentInput;
    for (const row of taskTableRows) {
      currentUserID = parseInt(row.getAttribute("data-userid"), 10);
      if (!currentUserID) {
        continue;
      }
      currentUserID = parseInt(row.getAttribute("data-userid"), 10);
      currentInput = row.querySelectorAll("input")[0];
      const clickEvent = new MouseEvent("click");
      if (selectedUserID === currentUserID && selectAll) {
        if (currentInput.checked == false) {
          currentInput.dispatchEvent(clickEvent);
        }
      } else {
        if (currentInput.checked) {
          currentInput.dispatchEvent(clickEvent);
        }
      }
    }
  }

  // src/utilities/log.js
  function ke_log(message, outputpathname) {
    const { ConsoleLogging } = getAppConfig();
    if (outputpathname == void 0) {
      outputpathname = false;
    }
    var callingFunction = arguments.callee.caller.name;
    if (callingFunction.match(/^ke_.{2,3}_/) != null) {
      var extCodeStart = callingFunction.indexOf("_") + 1;
      var extCodeEnd = callingFunction.substr(extCodeStart).indexOf("_");
      var extCode = callingFunction.substr(extCodeStart, extCodeEnd);
      var extConfig = getExtensionConfig(extCode);
      if (extConfig != void 0 && extConfig.ConsoleLogging == false) {
        return;
      }
    }
    if (callingFunction.startsWith("ke_") && ConsoleLogging == false) {
      return;
    }
    if (callingFunction == "") {
      callingFunction = "ke_anonymous";
    }
    var currentDate = new Date();
    var dateString = currentDate.toISOString().substr(0, 19).replace("T", " ");
    var output = dateString + " " + callingFunction + ": " + message;
    if (outputpathname) {
      output += "\n" + window.location.pathname;
    }
    console.log(output);
  }

  // src/plugins/shortcuts-bar.js
  function initialize5() {
    if (isCMSDashboard) {
      ke_sb_observeDashboardUpdates();
    }
    if (!isCMSRootIFrame) {
      return;
    }
    const extConfig = getExtensionConfig("sb");
    if (!extConfig.Enabled) {
      return;
    }
    window.addEventListener("storage", ke_sb_localStorageCheck);
    ke_sb_load();
  }
  function ke_sb_observeDashboardUpdates() {
    var buttonEventBound = false;
    const mutationObserver = new MutationObserver(function(mutations) {
      if (buttonEventBound)
        return;
      mutations.forEach(function() {
        if (buttonEventBound)
          return;
        const editButton = document.querySelector("button.btn.btn-edit-mode.btn-default.icon-only");
        if (editButton !== null) {
          editButton.addEventListener("click", ke_se_editDashboardClick, false);
          buttonEventBound = true;
        }
      });
    });
    const dashboardContainer = document.querySelector("body");
    if (dashboardContainer !== null) {
      mutationObserver.observe(dashboardContainer, {
        childList: true,
        subtree: true
      });
    }
  }
  function ke_se_editDashboardClick() {
    var addNewAppLink = document.querySelector("a.tile-dead-btn.tile-btn.tile-btn-add");
    var addAppLinkHidden = addNewAppLink.parentElement.classList.contains("ng-hide");
    if (!this.className.endsWith("active") && !addAppLinkHidden) {
      ke_log("updating shortcuts bar");
      localStorage.setItem("ke-shortcutsbar-lastupdated", ke_getCurrentDateTimeString());
    }
  }
  function ke_sb_localStorageCheck(e) {
    if (e.key === "ke-shortcutsbar-lastupdated") {
      ke_sb_refresh(false);
    }
  }
  async function ke_sb_load() {
    const masterContainer = isCMSRootIFrame();
    if (!masterContainer) {
      return;
    }
    const kenavbar = document.createElement("div");
    kenavbar.id = "ke-nav-bar";
    kenavbar.className = "ke-nav-bar";
    kenavbar.style.backgroundColor = "#ffffff";
    const kenavbarlabel = document.createElement("div");
    kenavbarlabel.id = "ke-nav-bar-label";
    kenavbarlabel.className = "ke-nav-bar-label";
    kenavbarlabel.style.display = "none";
    const kenavbarinnerlabel = document.createElement("div");
    kenavbarinnerlabel.id = "ke-nav-bar-inner-label";
    kenavbarinnerlabel.className = "ke-nav-bar-inner-label";
    kenavbarlabel.appendChild(kenavbarinnerlabel);
    const hideShowLink = document.createElement("a");
    hideShowLink.id = "ke-nav-bar-hideshow";
    hideShowLink.className = "ke-nav-bar-hideshow";
    hideShowLink.title = "Hide Shortcuts Bar";
    hideShowLink.onclick = ke_sb_hideShow;
    const hideShowIcon = document.createElement("i");
    hideShowIcon.className = "icon-chevron-right cms-nav-icon-medium icon-hideshow";
    hideShowLink.appendChild(hideShowIcon);
    const menuLink = document.createElement("a");
    menuLink.id = "ke-nav-bar-menu";
    menuLink.className = "ke-nav-bar-menu";
    menuLink.title = "Menu";
    menuLink.onmouseenter = ke_sb_showMenu;
    menuLink.onmouseleave = ke_sb_hideMenu;
    const menuIcon = document.createElement("i");
    menuIcon.className = "icon-menu cms-nav-icon-medium";
    menuLink.appendChild(menuIcon);
    const menuContent = document.createElement("div");
    menuContent.id = "ke-nav-bar-menu-content";
    menuContent.className = "ke-nav-bar-menu-content";
    menuContent.onmouseenter = ke_sb_showMenu;
    menuContent.onmouseleave = ke_sb_hideMenu;
    const configItem = document.createElement("a");
    configItem.id = "ke-nav-bar-config";
    configItem.className = "ke-nav-bar-config";
    configItem.innerHTML = "Config";
    configItem.href = "/kenticoextensions/config.aspx";
    configItem.target = "_blank";
    menuContent.appendChild(configItem);
    const konsoleItem = document.createElement("a");
    konsoleItem.id = "ke-nav-bar-konsole";
    konsoleItem.className = "ke-nav-bar-konsole";
    konsoleItem.innerHTML = "Konsole";
    konsoleItem.href = "#";
    konsoleItem.addEventListener("click", ke_sb_hideShow, false);
    menuContent.appendChild(konsoleItem);
    const konsoleTabItem = document.createElement("a");
    konsoleTabItem.id = "ke-nav-bar-konsole-tab";
    konsoleTabItem.className = "ke-nav-bar-konsole-tab";
    konsoleTabItem.innerHTML = "Konsole Tab";
    konsoleTabItem.href = "/kenticoextensions/konsole.aspx";
    konsoleTabItem.target = "_blank";
    menuContent.appendChild(konsoleTabItem);
    const refreshItem = document.createElement("a");
    refreshItem.id = "ke-nav-bar-refresh";
    refreshItem.className = "ke-nav-bar-refresh";
    refreshItem.innerHTML = "Refresh Nav Bar";
    refreshItem.href = "#";
    refreshItem.addEventListener("click", ke_sb_refresh, false);
    menuContent.appendChild(refreshItem);
    const navBarLine = document.createElement("div");
    navBarLine.className = "ke-nav-bar-line";
    menuContent.appendChild(navBarLine);
    const liveSiteItem = document.createElement("a");
    liveSiteItem.id = "ke-nav-bar-livesite";
    liveSiteItem.className = "ke-nav-bar-livesite";
    liveSiteItem.innerHTML = "Live Site";
    const { publicSiteURL } = getAppConfig();
    liveSiteItem.href = publicSiteURL;
    liveSiteItem.target = "_blank";
    menuContent.appendChild(liveSiteItem);
    var userid = getCurrentSession().id;
    var shortcutBarItems = await get({ data: "shortcutbaritems", userid });
    if (shortcutBarItems.length) {
      const shortcutBarElements = ke_sb_build(shortcutBarItems);
      kenavbar.appendChild(shortcutBarElements);
      kenavbar.appendChild(menuLink);
      kenavbar.appendChild(hideShowLink);
      const totalItems = kenavbar.getElementsByTagName("a").length;
      kenavbar.appendChild(menuContent);
      kenavbar.style.width = totalItems * 36 + "px";
      masterContainer.parentNode.insertBefore(kenavbar, masterContainer);
      kenavbarlabel.style.width = kenavbar.style.width;
      masterContainer.parentNode.insertBefore(kenavbarlabel, masterContainer);
    }
    if (!shortcutBarItems.length) {
      const messageDiv = document.createElement("div");
      messageDiv.id = "ke-nav-bar-message";
      messageDiv.className = "ke-nav-bar-message";
      messageDiv.innerHTML = "Add tiles to your dashboard to populate this shorcuts bar";
      kenavbar.appendChild(messageDiv);
      kenavbar.appendChild(menuLink);
      kenavbar.appendChild(menuContent);
      kenavbar.appendChild(hideShowLink);
      kenavbar.style.width = "500px";
      masterContainer.parentNode.insertBefore(kenavbar, masterContainer);
    }
    ke_log("shortcuts bar loaded");
  }
  function ke_sb_build(shortcutBarItems) {
    const shortcutsSpan = document.createElement("span");
    shortcutsSpan.id = "ke-nav-bar-shortcuts";
    shortcutsSpan.className = "ke-nav-bar-shortcuts";
    shortcutBarItems.forEach(function(sbi) {
      const shortcutLink = document.createElement("a");
      shortcutLink.id = `ke-nav-bar-${sbi.name.toLowerCase().replace(" ", "-")}`;
      shortcutLink.dataset.label = sbi.name;
      shortcutLink.href = "#" + sbi.guid;
      shortcutLink.onmouseover = function() {
        const navbarlabel = document.getElementById("ke-nav-bar-label");
        const navbarinnerlabel = navbarlabel.firstChild;
        navbarinnerlabel.innerHTML = this.dataset.label;
        navbarlabel.style.display = "";
      };
      shortcutLink.onmouseout = function() {
        const navbarlabel = document.getElementById("ke-nav-bar-label");
        navbarlabel.style.display = "none";
      };
      const shortcutIcon = document.createElement("i");
      shortcutIcon.className = `${sbi.iconClass} cms-nav-icon-medium icon-${sbi.iconColor.toLowerCase()}`;
      shortcutLink.appendChild(shortcutIcon);
      shortcutsSpan.appendChild(shortcutLink);
    });
    return shortcutsSpan;
  }
  function ke_sb_refresh(updateLocalStorage) {
    const masterContainer = isCMSRootIFrame();
    if (!masterContainer) {
      return;
    }
    ke_log("shortcuts bar refreshing");
    var { id } = getCurrentSession();
    localStorage.removeItem("data=shortcutbaritems&userid=" + id);
    const shortcutsBar = document.getElementById("ke-nav-bar");
    if (shortcutsBar) {
      masterContainer.parentNode.removeChild(shortcutsBar);
    }
    ke_sb_load();
    if (updateLocalStorage) {
      localStorage.setItem("ke-shortcutsbar-lastupdated", ke_getCurrentDateTimeString());
    }
  }
  function ke_sb_hideShow() {
    const shortcutsBar = document.getElementById("ke-nav-bar");
    var elementToHideShow = document.getElementById("ke-nav-bar-shortcuts");
    if (!elementToHideShow) {
      elementToHideShow = document.getElementById("ke-nav-bar-message");
    }
    if (!elementToHideShow) {
      return;
    }
    const hideShowLink = document.getElementById("ke-nav-bar-hideshow");
    const hideShowIcon = hideShowLink.getElementsByClassName("icon-hideshow")[0];
    if (hideShowIcon.classList.contains("icon-chevron-right")) {
      shortcutsBarWidth = shortcutsBar.style.width;
      hideShowIcon.className = hideShowIcon.className.replace("icon-chevron-right", "icon-chevron-left");
      hideShowLink.title = "Show Shortcuts Bar";
      elementToHideShow.style.display = "none";
      shortcutsBar.style.backgroundColor = "";
      return;
    }
    hideShowIcon.className = hideShowIcon.className.replace("icon-chevron-left", "icon-chevron-right");
    hideShowLink.title = "Hide Shortcuts Bar";
    elementToHideShow.style.display = "";
    shortcutsBar.style.backgroundColor = "#ffffff";
  }
  function ke_sb_showMenu() {
    document.getElementById("ke-nav-bar-menu-content").style.display = "block";
  }
  function ke_sb_hideMenu() {
    document.getElementById("ke-nav-bar-menu-content").style.display = "none";
  }

  // src/plugins/media-selector.js
  function initialize6() {
    const mediaSelectors = document.querySelectorAll(".media-selector-image");
    if (!mediaSelectors.length) {
      return;
    }
    const extConfig = getExtensionConfig("ms");
    if (!extConfig.Enabled) {
      return;
    }
    const mutationObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        const testMutation = mutation;
        if (mutation.addedNodes.length === 1 && mutation.addedNodes[0].id !== void 0 && mutation.addedNodes[0].id.indexOf("mediaSelector") > 0) {
          ke_ms_addImageSizeLabel(mutation.target);
        }
      });
    });
    mediaSelectors.forEach(async function(ms) {
      await ke_ms_addImageSizeLabel(ms);
    });
    mediaSelectors.forEach(function(ms) {
      mutationObserver.observe(ms, { childList: true });
    });
  }
  async function ke_ms_addImageSizeLabel(ms) {
    ms = ms.parentNode;
    const msinput = ms.querySelector("input");
    if (msinput.value === "") {
      return;
    }
    const imageurl = msinput.value.replaceAll("&amp;", "&");
    let msimage = ms.querySelector("img");
    if (!msimage) {
      return;
    }
    const fileguid = imageurl.replace("~/getmedia/", "").replace("/getmedia/", "").substring(0, 36);
    const width = getQueryStringValue("width", imageurl);
    const height = getQueryStringValue("height", imageurl);
    const mediaFile = await get({
      data: "mediafileinfo",
      fileguid,
      width,
      height
    });
    const imagedimensions = `${mediaFile.Width} x ${mediaFile.Height}`;
    const bytes = ke_formatBytes(mediaFile.Size);
    const sizehtml = `<br><b>Size:</b> ${imagedimensions} (${bytes})`;
    const titlehtml = mediaFile.Title !== "" ? `<br><b>Title:</b> ${mediaFile.Title}` : "";
    const deschtml = mediaFile.Description !== "" ? `<br><b>Alt Text:</b> ${mediaFile.Description}` : "";
    msimage = document.querySelector(`img[src*="${mediaFile.GUID}"]`).parentNode;
    const mslabel = msimage.querySelector(".ke-ms-label");
    const labelhtmk = sizehtml + titlehtml + deschtml;
    if (mslabel) {
      mslabel.innerHTML = labelhtmk;
      return;
    }
    const labelElement = document.createElement("div");
    labelElement.id = mediaFile.GUID;
    labelElement.className = "ke-ms-label";
    labelElement.title = "Information provided by Kentico Extensions :)";
    labelElement.innerHTML = labelhtmk;
    msimage.appendChild(labelElement);
  }

  // src/plugins/plugins.js
  function initializePlugins() {
    initialize();
    initialize2();
    initialize3();
    initialize4();
    initialize5();
    initialize6();
  }

  // src/kenticoextensions.js
  (async function init() {
    if (isLoginPage()) {
      localStorage.clear();
      return;
    }
    const sessionData = await get({ data: "session" });
    setCurrentSession({
      id: sessionData.UserID,
      guid: sessionData.UserGUID,
      username: sessionData.UserName,
      globalAdmin: sessionData.GlobalAdmin
    });
    const config2 = await get({ data: "configuration" });
    setAppConfig(config2);
    if (config2.Enabled && isCurrentSessionEnabled()) {
      document.dispatchEvent(new Event("ke_init_complete"));
      initializePlugins();
    }
  })();
})();
//# sourceMappingURL=kenticoextensions.js.map
