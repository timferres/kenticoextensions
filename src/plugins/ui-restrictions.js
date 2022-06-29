import { getCurrentSession } from '../auth/session';
import { get } from '../infrastructure/api';
import { getExtensionConfig } from '../infrastructure/config';
import {
  isEventLog,
  isMediaLibraryList,
  isStagingFrame,
} from '../utilities/url';

/*
Extension: UI Restriction (uir)
Description: Disables specific UI elements if the user is not within the CMS UI Restriction Override role.
*/

export async function initialize() {
  const extConfig = getExtensionConfig('uir');
  if (!extConfig?.Enabled) {
    return;
  }

  const buttonArray = ke_uir_getButtons();
  ke_uir_disableButtons(buttonArray);
  await ke_uir_enableButtons(buttonArray);
}

function ke_uir_getButtons() {
  // Event Log > Clear Log button
  let buttonArray = [];
  const clearLogButton = document.querySelector("button[value='Clear log']");
  if (isEventLog() && clearLogButton) {
    buttonArray.push(clearLogButton);
  }

  // Media Library > List > Delete action
  if (isMediaLibraryList()) {
    const deleteButtons = document.querySelectorAll("button[title='Delete']");
    if (deleteButtons) {
      buttonArray.push(...deleteButtons);
    }
  }

  // Staging > Synchronize buttons
  if (isStagingFrame()) {
    const syncAll = document.querySelector("button[value='Synchronize all']");
    if (syncAll) {
      buttonArray.push(syncAll);
    }
    const deleteAll = document.querySelector("button[value='Delete all']");
    if (deleteAll) {
      buttonArray.push(deleteAll);
    }

    const syncSubtree = document.querySelector(
      "button[value='Synchronize current subtree']"
    );
    if (syncSubtree) {
      buttonArray.push(syncSubtree);
    }
    const runComplete = document.querySelector(
      "button[value='Run complete synchronization']"
    );
    if (runComplete) {
      buttonArray.push(runComplete);
    }
  }

  return buttonArray;
}

function ke_uir_disableButtons(buttonArray) {
  for (const btn of buttonArray) {
    btn.disabled = true;
    btn.title =
      'This has been disabled by Kentico Extensions for your safety :)';
  }
}

async function ke_uir_enableButtons(buttonArray) {
  const { id } = getCurrentSession();
  const userRoles = await get({ data: 'userroles', userid: id });
  const restrictionOverride =
    userRoles.filter((r) => {
      return r.RoleDisplayName === 'CMS UI Restriction Override';
    }).length > 0;

  if (restrictionOverride) {
    // re-enable the buttons
    for (const btn of buttonArray) {
      btn.disabled = false;
      btn.title = 'Please use with caution!';
    }
  }
}
