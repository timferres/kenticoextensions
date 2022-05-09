import { get } from '../infrastructure/api';
import { ke_getExtensionConfiguration } from '../infrastructure/config';
import { ke_getQueryStringValue } from '../utilities/url';
import { ke_getISODateTimeString } from '../utilities/formatting';

/*
Extension: Document Information (di)
Description: Displays additional information within the document view.
*/
document.addEventListener('ke_init_complete', initialize, false);

async function initialize() {
  if (
    !window.location.href.includes(
      '/CMSModules/AdminControls/Pages/UIPage.aspx'
    )
  ) {
    return;
  }

  const allNavTabs = document.querySelectorAll('.nav-tabs');

  if (!allNavTabs.length) {
    return;
  }

  const extConfig = ke_getExtensionConfiguration('di');

  if (!extConfig.Enabled) {
    return;
  }

  const nodeid = ke_getQueryStringValue('nodeid');

  if (nodeid == null || nodeid == '') {
    return;
  }

  const docItems = await get({ data: 'documentinfo', nodeid });

  if (docItems.length < 1) {
    return;
  }

  const [navTabs] = allNavTabs;
  const [docItem] = docItems;

  const dateTimeString = docItem.DocumentModifiedWhen.replace(
    'T',
    ' '
  ).substring(0, 19);
  dateTimeString = ke_getISODateTimeString(docItem.DocumentModifiedWhen, '12');

  const infoDiv = document.createElement('div');
  infoDiv.id = `ke_di_node_${docItem.NodeID}`;
  infoDiv.className = 'ke-di-info-div';
  infoDiv.innerHTML = `<strong>Last modified:</strong> ${docItem.DocumentModifiedBy} (${dateTimeString}) | <a href="${docItem.AbsolutePath}" target="_blank">Live Version</a><br />`;

  navTabs.appendChild(infoDiv);
}
