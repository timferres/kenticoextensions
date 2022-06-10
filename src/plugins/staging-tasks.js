import { get } from '../infrastructure/api';
import { getExtensionConfig } from '../infrastructure/config';
import { isStagingFrame } from '../utilities/url';

/*
Extension: Staging Task User Filter (stuf)
Description: Adds a user filter and column to the staging task list
*/
let ke_stuf_initalised = false;
let ke_stuf_userColumnLoaded = false;
let ke_stuf_userFilterLoaded = false;

export async function initialize() {
  if (ke_stuf_initalised) {
    return;
  }

  // detect if the current page is a staging task list
  if (!isStagingFrame()) {
    return;
  }
  // Possibly only show filter if all items are shown
  // Filter does not work well with pagination
  /*
    const itemsPerPageSelect = document.querySelectorAll("select[id$='drpPageSize']")[0];
    const itemsPerPageValue = itemsPerPageSelect[itemsPerPageSelect.selectedIndex].value;
    if (itemsPerPageValue != -1) { return; }
    */

  const extConfig = getExtensionConfig('stuf');
  if (!extConfig?.Enabled) {
    return;
  }

  await ke_stuf_initUserColumn();
  await ke_stuf_initUserFilter();
  ke_stuf_addSelectAllCheckBox();

  Sys.WebForms.PageRequestManager.getInstance().add_endRequest(
    ke_stuf_endRequestHandler
  );

  ke_stuf_initalised = true;
}

async function ke_stuf_initUserColumn() {
  const serverSelect = document.querySelectorAll(
    "select[id$='drpSingleSelect']"
  )[0];
  const serverid = serverSelect.options[serverSelect.selectedIndex].value;

  const task = await get({ data: 'stagingtasks', serverid });

  await ke_stuf_addUserColumn(task);
}

async function ke_stuf_addUserColumn(taskData) {
  //get table
  //iterate each row and add th or td
  const taskTable = document.querySelector("table[id^='m_c_']");
  const taskTitleCol = taskTable.querySelectorAll('th')[2];
  const headerCol = document.createElement('th');
  headerCol.innerHTML = 'User';
  taskTitleCol.insertAdjacentElement('afterend', headerCol);

  const [_, ...taskTableRows] = taskTable.querySelectorAll('tr');
  let currentTaskID = 0;
  let titleCol;
  let currentInput;

  for (const row of taskTableRows) {
    currentInput = row.querySelectorAll('input')[0];
    currentTaskID = currentInput.getAttribute('data-arg');
    currentTaskID = Number(currentTaskID);
    titleCol = row.querySelectorAll('td')[2];
    const taskRecord = await ke_stuf_getTaskByTaskID(taskData, currentTaskID);

    const userCol = document.createElement('td');

    if (!taskRecord) {
      userCol.innerHTML = '&nbsp;';
      titleCol.insertAdjacentElement('afterend', userCol);
      currentInput.setAttribute('data-useridlist', 0);
      row.setAttribute('data-useridlist', 0);
    } else {
      userCol.innerHTML = taskRecord.UserFullNameList;
      titleCol.insertAdjacentElement('afterend', userCol);
      currentInput.setAttribute('data-useridlist', taskRecord.UserIDList);
      row.setAttribute('data-useridlist', taskRecord.UserIDList);
    }
  }

  ke_stuf_userColumnLoaded = true;
  ke_stuf_refreshFilter();
}

async function ke_stuf_getTaskByTaskID(taskData, taskID) {
  taskData.find((d) => d.TaskID === taskID);
}

async function ke_stuf_initUserFilter() {
  const serverSelect = document.querySelectorAll(
    "select[id$='drpSingleSelect']"
  )[0];
  const serverid = serverSelect.options[serverSelect.selectedIndex].value;

  const userData = await get({ data: 'stagingusers', serverid });

  ke_stuf_addUserFilter(userData);
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

  for (const user of userData) {
    const opt = document.createElement('option');
    opt.value = user.UserID;
    opt.innerHTML = user.UserFullName;
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
  const [_, ...taskTableRows] = taskTable.querySelectorAll('tr');

  let visibleRows = 0;
  let selectedRows = 0;

  for (const row of taskTableRows) {
    const currentUserIDList = row.getAttribute('data-useridlist');
    if (!currentUserIDList) {
      continue;
    }
    const currentInput = row.getElementsByTagName('input')[0];

    if (currentUserIDList.includes(`|${selectedUserID}|`)) {
      row.style = 'display: table-row;';
      visibleRows++;
    } else if (selectedUserID === '0') {
      row.style = 'display: table-row;';
      visibleRows++;
    } else {
      row.style = 'display: none;';
      if (currentInput.checked) {
        currentInput.dispatchEvent(new MouseEvent('click'));
      }
    }

    if (currentInput.checked) {
      selectedRows++;
    }
  }

  // if all visible rows are selected, check the select all checkbox
  if (visibleRows === selectedRows) {
    document.querySelector('#kentico-extensions-select-all').checked = true;
  } else {
    document.querySelector('#kentico-extensions-select-all').checked = false;
  }
}

async function ke_stuf_endRequestHandler(sender, args) {
  await ke_stuf_initUserColumn();
  ke_stuf_addSelectAllCheckBox();
  ke_stuf_refreshFilter();
}

function ke_stuf_selectAll() {
  const selectAll = document.querySelector(
    '#kentico-extensions-select-all'
  ).checked;
  const userSelect = document.querySelector('#kentico-extensions-user-filter');
  const selectedUserID = parseInt(userSelect.selectedOptions[0].value, 10);
  const taskTable = document.querySelector("table[id^='m_c_']");
  const taskTableRows = taskTable.querySelectorAll('tr');

  let currentUserID = 0;
  let currentInput;

  for (const row of taskTableRows) {
    currentUserID = parseInt(row.getAttribute('data-userid'), 10);

    if (!currentUserID) {
      continue;
    }

    currentUserID = parseInt(row.getAttribute('data-userid'), 10);
    currentInput = row.querySelectorAll('input')[0];

    const clickEvent = new MouseEvent('click');

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
