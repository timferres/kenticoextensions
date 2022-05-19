import { ke_getConfiguration } from './infrastructure/config';
import { ke_checkUserDisabled, ke_checkUserEnabled } from './auth/session';
import { ke_init } from './infrastructure/init';

import { initialize as initializeEnvironmentsBar } from './plugins/environments-bar';

/*
Kentico Extensions Common
Description: Common methods required by multiple Kentico Extensions
*/
async function init() {
  if (!document.querySelector('.CMSDeskContent')) {
    return;
  }

  var ke_init_complete = await ke_init();

  const { Enabled } = ke_getConfiguration();

  if (Enabled && ke_checkUserEnabled() && !ke_checkUserDisabled()) {
    // initalise all the extensions
    document.dispatchEvent(ke_init_complete);

    initializeEnvironmentsBar();
  }
}

init();
