import { ke_setUserInfo } from '../auth/session';
import { get } from './api';
import { ke_setConfiguration } from './config';

export async function ke_init() {
  const ke_init_complete = new Event('ke_init_complete');
  if (window.location.href.indexOf('/CMSPages/logon.aspx') != -1) {
    // clear local storage to avoid using cached data for another user
    localStorage.clear();
    // don't do anything else since it is the login page
    return ke_init_complete;
  }

  const sessionData = await get({ data: 'session' });

  ke_setUserInfo({
    id: sessionData.UserID,
    guid: sessionData.UserGUID,
    username: sessionData.UserName,
    globalAdmin: sessionData.GlobalAdmin,
  });

  const config = await get({ data: 'configuration' });

  ke_setConfiguration(config);

  return ke_init_complete;
}
