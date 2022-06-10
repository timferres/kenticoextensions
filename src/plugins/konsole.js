/*
Extension: Konsole (ko)
Description: Provides an interactive console for developers
*/

import { getAppConfig } from '../infrastructure/config';

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
    getQueryStringValue('showkonsole') === 'true' ||
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

function ke_ko_commandComplete(output) {
  document.getElementById('ke-ko-spinner').style.display = 'none';
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
  var args = inputValue.split(' ');
  if (args.length > position) {
    return args[position].toLowerCase();
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
  const { siteURL } = getAppConfig();

  var filteredResults = ke_ko_filterDataset(dataSet);
  var displaySet = [];
  filteredResults.forEach(function (settingKey) {
    var displayItem = new Object();
    displayItem.Name = settingKey.Name;
    displayItem.DisplayName = settingKey.DisplayName;
    if (settingKey.CategoryParentID !== null)
      displayItem.DisplayName =
        `<a target="_blank" href="` +
        siteURL +
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
  const { adminURL, publicSiteURL } = getAppConfig();

  var filteredResults = ke_ko_filterDataset(dataSet);
  var displaySet = [];
  filteredResults.forEach(function (resultItem) {
    var displayItem = new Object();
    displayItem.DocumentNamePath =
      `<a target="_blank" href="` +
      adminURL +
      `?action=edit&nodeid=` +
      resultItem.NodeID +
      `&culture=` +
      resultItem.DocumentCulture +
      `#95a82f36-9c40-45f0-86f1-39aa44db9a77">` +
      resultItem.DocumentNamePath +
      `</a>`; // the GUID is the pages ui element identifier
    displayItem.NodeAliasPath =
      `<a target="_blank" href="` +
      publicSiteURL +
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
