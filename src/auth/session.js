import { getAppConfig } from '../infrastructure/config';

const userInfo = {
  id: 0,
  guid: '00000000-0000-0000-0000-000000000000',
  username: '',
  globalAdmin: false,
};

export function isCurrentSessionEnabled() {
  const { EnabledUserNames, DisabledUserNames } = getAppConfig();

  return (
    userInfo.username &&
    (!EnabledUserNames.length || EnabledUserNames.includes(userInfo.username)) &&
    !DisabledUserNames.includes(userInfo.username)
  );
}

export function getCurrentSession() {
  return {
    ...userInfo,
  };
}

export function setCurrentSession(info) {
  userInfo.guid = info.guid;
  userInfo.id = info.id;
  userInfo.username = info.username;
  userInfo.globalAdmin = info.globalAdmin;
}
