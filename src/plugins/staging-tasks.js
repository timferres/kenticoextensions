const { ke_getExtensionConfiguration } = require('../infrastructure/config');

/*
Extension: Staging Task User Filter (stuf)
Description: Adds a user filter and column to the staging task list
*/
const ke_stuf_initalised = false;
const ke_stuf_userColumnLoaded = false;
const ke_stuf_userFilterLoaded = false;
document.addEventListener('ke_init_complete', initialize, false);

function initialize() {
  if (ke_stuf_initalised) {
    return;
  }

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
  ) {
    return;
  }
  // Possibly only show filter if all items are shown
  // Filter does not work well with pagination
  /*
    const itemsPerPageSelect = document.querySelectorAll("select[id$='drpPageSize']")[0];
    const itemsPerPageValue = itemsPerPageSelect[itemsPerPageSelect.selectedIndex].value;
    if (itemsPerPageValue != -1) { return; }
    */

  const extConfig = ke_getExtensionConfiguration('stuf');
  if (!extConfig?.Enabled) {
    return;
  }

  ke_stuf_initUserColumn(false);
  ke_stuf_initUserFilter(false);
  ke_stuf_addSelectAllCheckBox();

  Sys.WebForms.PageRequestManager.getInstance().add_endRequest(
    ke_stuf_endRequestHandler
  );

  ke_stuf_initalised = true;
}

function ke_stuf_initUserColumn(refreshData) {
  const serverSelect = document.querySelectorAll(
    "select[id$='drpSingleSelect']"
  )[0];
  const serverid = serverSelect.options[serverSelect.selectedIndex].value;
  const qsParams = 'data=stagingtasks&serverid=' + serverid;
  ke_getAPIDataAsync(qsParams, refreshData, ke_stuf_addUserColumn, true);
}

function ke_stuf_addUserColumn(taskData) {
  //get table
  //iterate each row and add th or td
  const taskTable = document.querySelector("table[id^='m_c_']");
  const taskTitleCol = taskTable.querySelectorAll('th')[2];
  const headerCol = document.createElement('th');
  headerCol.innerHTML = 'User';
  taskTitleCol.insertAdjacentElement('afterend', headerCol);

  const taskTableRows = taskTable.querySelectorAll('tr');
  const currentTaskID = 0;
  let titleCol;
  let currentInput;
  for (const i = 1; i < taskTableRows.length; i++) {
    currentInput = taskTableRows[i].querySelectorAll('input')[0];
    currentTaskID = currentInput.getAttribute('data-arg');
    currentTaskID = Number(currentTaskID);
    titleCol = taskTableRows[i].querySelectorAll('td')[2];
    const userCol = document.createElement('td');
    const taskRecord = ke_stuf_getTaskByTaskID(taskData, currentTaskID);
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
  for (const i = 0; i < taskData.length; i++) {
    if (taskData[i].TaskID == taskID) {
      return taskData[i];
    }
  }
}

function ke_stuf_initUserFilter(refreshData) {
  const serverSelect = document.querySelectorAll(
    "select[id$='drpSingleSelect']"
  )[0];
  const serverid = serverSelect.options[serverSelect.selectedIndex].value;
  const qsParams = 'data=stagingusers&serverid=' + serverid;
  ke_getAPIDataAsync(qsParams, refreshData, ke_stuf_addUserFilter, true);
}

function ke_stuf_addUserFilter(userData) {
  const panelContainer = document.getElementById('m_pnlContainer');
  if (panelContainer === null) {
    return;
  }

  const userPanel = document.createElement('div');
  userPanel.id = 'm_pnlUserSelector';
  userPanel.className = 'header-panel';
  userPanel.style = 'padding: 8px 16px 8px 16px';

  const userFilterContainer = document.createElement('div');
  userFilterContainer.className =
    'form-horizontal form-filter user-selector ke-stuf-filter-container';
  userFilterContainer.style = 'float: right';

  const userLabel = document.createElement('div');
  userLabel.className = 'filter-form-label-cell';
  userLabel.innerHTML =
    '<span id="usersLabel" class="control-label">User:</span>';

  const userFilter = document.createElement('div');
  userFilter.className = 'filter-form-value-cell-wide';

  const userSelect = document.createElement('select');
  userSelect.id = 'kentico-extensions-user-filter';
  userSelect.className = 'DropDownField form-control';

  const optAll = document.createElement('option');
  optAll.value = 0;
  optAll.innerHTML = 'All';
  userSelect.appendChild(optAll);

  for (const i = 0; i < userData.length; i++) {
    const opt = document.createElement('option');
    opt.value = userData[i].UserID;
    opt.innerHTML = userData[i].UserFullName;
    userSelect.appendChild(opt);
  }

  userFilter.appendChild(userSelect);

  userFilterContainer.appendChild(userLabel);
  userFilterContainer.appendChild(userFilter);

  userPanel.appendChild(userFilterContainer);

  // if actions does not exist add it for styling
  const actionsPanel = document.createElement('div');
  actionsPanel.id = 'm_pnlActions';
  actionsPanel.className = 'cms-edit-menu';

  if (document.getElementById('m_pnlActions') === null) {
    panelContainer.appendChild(actionsPanel);
  }

  panelContainer.appendChild(userPanel);

  userSelect.addEventListener('change', ke_stuf_applyFilter, false);

  ke_stuf_userFilterLoaded = true;

  const contentPanel = document.getElementById('m_pnlContent');
  if (contentPanel === null) {
    return;
  }
  contentPanel.style = 'margin-top: 28px';
}

function ke_stuf_addSelectAllCheckBox() {
  const kenticoSelectAllCheckbox = document.querySelector(
    "input[id$='headerBox']"
  );
  if (kenticoSelectAllCheckbox == null) {
    return;
  }

  const customSelectAllCheckbox = document.createElement('input');
  customSelectAllCheckbox.id = 'kentico-extensions-select-all';
  customSelectAllCheckbox.type = 'checkbox';
  customSelectAllCheckbox.disabled = true;
  customSelectAllCheckbox.addEventListener('click', ke_stuf_selectAll, false);

  const customSelectAllCheckboxLabel = document.createElement('label');
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
  const userSelect = document.querySelector('#kentico-extensions-user-filter');
  const selectedUserID = userSelect.selectedOptions[0].value;

  if (selectedUserID != 0) {
    document.querySelector("input[id$='headerBox']").checked = false;
    document.querySelector("input[id$='headerBox']").disabled = true;
    document.querySelector('label[for*="headerBox"').style.display = 'none';
    document.querySelector('#kentico-extensions-select-all').disabled = false;
    document.querySelector(
      '#kentico-extensions-select-all-label'
    ).style.display = '';
    document.querySelector('#m_c_btnSyncAll').disabled = true;
    document.querySelector('#m_c_btnDeleteAll').disabled = true;
  } else {
    document.querySelector("input[id$='headerBox']").disabled = false;
    document.querySelector('label[for*="headerBox"').style.display = '';
    document.querySelector('#kentico-extensions-select-all').disabled = true;
    document.querySelector(
      '#kentico-extensions-select-all-label'
    ).style.display = 'none';
    document.querySelector('#m_c_btnSyncAll').disabled = false;
    document.querySelector('#m_c_btnDeleteAll').disabled = false;
  }

  //iterate each row, if not assigned to user, hide the row
  const taskTable = document.querySelector("table[id^='m_c_']");
  const taskTableRows = taskTable.querySelectorAll('tr');
  const currentUserID = 0;
  let currentInput;
  const visibleRows = 0;
  const selectedRows = 0;
  for (const i = 1; i < taskTableRows.length; i++) {
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
        const clickEvent = new MouseEvent('click');
        currentInput.dispatchEvent(clickEvent);
      }
    }

    if (currentInput.checked) {
      selectedRows++;
    }
  }

  // if all visible rows are selected, check the select all checkbox
  if (visibleRows == selectedRows) {
    document.querySelector('#kentico-extensions-select-all').checked = true;
  } else {
    document.querySelector('#kentico-extensions-select-all').checked = false;
  }

  ke_log(document.querySelector("input[id$='hidSelection']").value);
}

function ke_stuf_endRequestHandler(sender, args) {
  ke_stuf_initUserColumn(true);
  ke_stuf_addSelectAllCheckBox();
  ke_stuf_refreshFilter();
}

function ke_stuf_selectAll() {
  const selectAll = document.querySelector(
    '#kentico-extensions-select-all'
  ).checked;
  const userSelect = document.querySelector('#kentico-extensions-user-filter');
  const selectedUserID = Number(userSelect.selectedOptions[0].value);
  const taskTable = document.querySelector("table[id^='m_c_']");
  const taskTableRows = taskTable.querySelectorAll('tr');
  const currentUserID = 0;
  let currentInput;
  for (const i = 1; i < taskTableRows.length; i++) {
    currentUserID = taskTableRows[i].getAttribute('data-userid');
    if (currentUserID == null) {
      continue;
    }
    currentUserID = Number(taskTableRows[i].getAttribute('data-userid'));
    currentInput = taskTableRows[i].querySelectorAll('input')[0];

    const clickEvent = new MouseEvent('click');
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
