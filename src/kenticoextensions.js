import { setAppConfig } from './infrastructure/config';
import { isCurrentSessionEnabled, setCurrentSession } from './auth/session';
import { get } from './infrastructure/api';

import { isCMSRootIFrame } from './utilities/dom';
import { isLoginPage } from './utilities/url';
import { initializePlugins } from './plugins/plugins';

(async function init() {
  if (isLoginPage()) {
    // clear local storage to avoid using cached data for another user
    localStorage.clear();

    // don't do anything else since it is the login page
    return;
  }

  const sessionData = await get({ data: 'session' });

  setCurrentSession({
    id: sessionData.UserID,
    guid: sessionData.UserGUID,
    username: sessionData.UserName,
    globalAdmin: sessionData.GlobalAdmin,
  });

  const config = await get({ data: 'configuration' });

  setAppConfig(config);

  if (config.Enabled && isCurrentSessionEnabled()) {
    // initalise all the extensions
    document.dispatchEvent(new Event('ke_init_complete'));

    initializePlugins();
  }
})();
