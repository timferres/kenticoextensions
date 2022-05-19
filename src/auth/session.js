import { ke_getConfiguration } from '../infrastructure/config';

const userInfo = {
  id: 0,
  guid: '00000000-0000-0000-0000-000000000000',
  username: '',
  globalAdmin: false,
};

export function ke_checkUserEnabled() {
  const { EnabledUserNames } = ke_getConfiguration();

  return EnabledUserNames.indexOf(userInfo.username) > -1;
}

export function ke_checkUserDisabled() {
  const { DisabledUserNames } = ke_getConfiguration();

  return DisabledUserNames.indexOf(userInfo.username) > -1;
}

export function ke_getUserInfo() {
  return {
    ...userInfo,
  };
}

export function ke_setUserInfo(info) {
  userInfo.guid = info.guid;
  userInfo.id = info.id;
  userInfo.username = info.username;
  userInfo.globalAdmin = info.globalAdmin;
}
