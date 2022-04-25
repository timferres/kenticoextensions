import { get } from '../infrastructure/api';
import { ke_getExtensionConfiguration } from '../infrastructure/config';
import { ke_getQueryStringValue } from '../utilities/url';
import { ke_getISODateTimeString } from '../utilities/formatting';

/*
Extension: Document Information (di)
Description: Displays additional information within the document view.
*/
document.addEventListener('ke_init_complete', ke_di_init, false);

async function ke_di_init() {
  if (
    !window.location.href.includes(
      '/CMSModules/AdminControls/Pages/UIPage.aspx'
    ) ||
    document.querySelectorAll('.nav-tabs').length == 0
  ) {
    return;
  }

  var extConfig = ke_getExtensionConfiguration('di');

  if (!extConfig.Enabled) {
    return;
  }

  var nodeid = ke_getQueryStringValue('nodeid');
  if (nodeid == null || nodeid == '') {
    return;
  }

  const docItems = await get({ data: 'documentinfo', nodeid });

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
  infoDiv.innerHTML = `<strong>Last modified:</strong> ${docItem.DocumentModifiedBy} (${dateTimeString}) | <a href="${docItem.AbsolutePath}" target="_blank">Live Version</a><br />`;

  navTabs.appendChild(infoDiv);
}
