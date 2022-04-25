import { ke_getUserInfo } from '../auth/session';
import { get } from '../infrastructure/api';
import { ke_getExtensionConfiguration } from '../infrastructure/config';

/*
Extension: UI Restriction (uir)
Description: Disables specific UI elements if the user is not within the CMS UI Restriction Override role.
*/
document.addEventListener('ke_init_complete', ke_uir_init, false);

async function ke_uir_init() {
  var extConfig = ke_getExtensionConfiguration('uir');

  if (!extConfig.Enabled) {
    return;
  }

  const ke_uir_buttonArray = [];

  ke_uir_getButtons(ke_uir_buttonArray);
  ke_uir_disableButtons(ke_uir_buttonArray);
  await ke_uir_enableButtons(ke_uir_buttonArray);
}

function ke_uir_getButtons(ke_uir_buttonArray) {
  // Event Log > Clear Log button
  if (
    window.location.href.includes('EventLog.aspx') &&
    document.querySelectorAll("button[value='Clear log']").length
  ) {
    ke_uir_buttonArray.push(
      document.querySelectorAll("button[value='Clear log']")[0]
    );
  }

  // Media Library > List > Delete action
  if (window.location.href.includes('Library_List.aspx')) {
    var mlDeleteButtons = document.querySelectorAll("button[title='Delete']");
    for (var i = 0; i < mlDeleteButtons.length; i++) {
      ke_uir_buttonArray.push(mlDeleteButtons[i]);
    }
  }

  // Staging > Synchronize buttons
  if (
    window.location.href.includes('/Staging/Tools/Tasks/Tasks.aspx') ||
    window.location.href.includes('/Staging/Tools/Data/Tasks.aspx') ||
    window.location.href.includes('/Staging/Tools/Objects/Tasks.aspx')
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

function ke_uir_disableButtons(ke_uir_buttonArray) {
  // disable all buttons
  for (var i = 0; i < ke_uir_buttonArray.length; i++) {
    ke_uir_buttonArray[i].disabled = true;
    ke_uir_buttonArray[i].title =
      'This has been disabled by Kentico Extensions for your safety :)';
  }
}

async function ke_uir_enableButtons(ke_uir_buttonArray) {
  const { id } = ke_getUserInfo();

  const userRoles = await get({ data: 'userroles', userid: id });

  if (
    userRoles.filter((r) => {
      return r.RoleDisplayName === 'CMS UI Restriction Override';
    }).length
  ) {
    // re-enable the buttons
    for (var i = 0; i < ke_uir_buttonArray.length; i++) {
      ke_uir_buttonArray[i].disabled = false;
      ke_uir_buttonArray[i].title = 'Please use with caution!';
    }
  }
}
