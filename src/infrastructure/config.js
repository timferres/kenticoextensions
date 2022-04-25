const ke_CMSSiteURL = window.location.origin + '/';
const ke_CMSAdminURL = ke_CMSSiteURL + 'admin/cmsadministration.aspx';
const ke_PublicSiteURL = ke_CMSSiteURL.replace('cms', 'site'); // This is client specific!
const ke_APIURL = ke_CMSSiteURL + 'kenticoextensions/api.ashx';

const config = {
  EnabledUserNames: [],
  DisabledUserNames: [],
  Enabled: false,
  ConsoleLogging: false,
  CacheListRefreshFrequency: 10000,
  Extensions: [],
  siteURL: ke_CMSSiteURL,
  adminURL: ke_CMSAdminURL,
  publicSiteURL: ke_PublicSiteURL,
  apiURL: ke_APIURL,
};

export function ke_getConfiguration() {
  return {
    ...config,
  };
}

export function ke_setConfiguration(newConfig) {
  config.Enabled = newConfig.Enabled;
  config.EnabledUserNames =
    newConfig.EnabledUserNames || config.EnabledUserNames;
  config.DisabledUserNames =
    newConfig.DisabledUserNames || config.DisabledUserNames;
  config.Extensions = newConfig.Extensions || config.Extensions;
  config.CacheListRefreshFrequency =
    newConfig.CacheListRefreshFrequency || config.CacheListRefreshFrequency;
}

export function ke_getExtensionConfiguration(code) {
  return config.Extensions.find((e) => e.Code === code) || {};
}
