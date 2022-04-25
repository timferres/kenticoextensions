import { ke_getExtensionConfiguration } from '../infrastructure/config';

/*
Extension: Environment Bar (eb)
Description: Adds a coloured bar to indicate the current environment
*/
document.addEventListener('ke_init_complete', ke_eb_init, false);

function ke_eb_init() {
  var masterContainer = document.querySelectorAll('.CMSDeskContent')[0];
  if (!masterContainer) {
    return;
  }

  var extConfig = ke_getExtensionConfiguration('eb');

  if (!extConfig.Enabled) {
    return;
  }

  if (!extConfig.Config) {
    return;
  }

  var envConfig = ke_eb_getEnvConfig(extConfig);

  if (envConfig == undefined) {
    return;
  }

  var envbar = document.createElement('div');
  envbar.id = 'ke-eb';
  envbar.className = 'ke-eb fullwidth';
  envbar.style.backgroundColor = envConfig.Color;
  masterContainer.parentNode.insertBefore(envbar, masterContainer);

  var envbarlabel = document.createElement('div');
  envbarlabel.id = 'ke-eb label';
  envbarlabel.className = 'ke-eb label';
  envbarlabel.style.backgroundColor = envConfig.Color;
  envbarlabel.innerHTML = `<span>${envConfig.Label}</span>`;
  masterContainer.parentNode.insertBefore(envbarlabel, masterContainer);
}

function ke_eb_getEnvConfig(ebConfig) {
  var envConfig = ebConfig.Config;
  var currentURL = window.location.hostname;
  for (var i = 0; i < envConfig.Environments.length; i++) {
    var configURL = envConfig.Environments[i].URL;
    if (configURL == currentURL) {
      return envConfig.Environments[i];
    }

    // starts with wildcard
    if (
      configURL.length > 1 &&
      !configURL.startsWith('*') &&
      configURL.endsWith('*') &&
      currentURL.startsWith(configURL.substr(0, configURL.length - 1)) === true
    ) {
      return envConfig.Environments[i];
    }

    // ends with wildcard
    if (
      configURL.length > 1 &&
      configURL.startsWith('*') &&
      !configURL.endsWith('*') &&
      currentURL.endsWith(configURL.substr(1)) === true
    ) {
      return envConfig.Environments[i];
    }

    // contains wildcard
    if (
      configURL.length > 2 &&
      configURL.startsWith('*') &&
      configURL.endsWith('*') &&
      currentURL.indexOf(configURL.substr(1, configURL.length - 2)) !== -1
    ) {
      return envConfig.Environments[i];
    }
  }
}
