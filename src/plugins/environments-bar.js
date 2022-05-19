import { ke_getExtensionConfiguration } from '../infrastructure/config';

/* 
Extension: Environment Bar (eb)
Description: Adds a coloured bar to indicate the current environment
*/
export function initialize() {
  const masterContainer = document.querySelectorAll('.CMSDeskContent')[0];
  if (!masterContainer) {
    return;
  }

  const extConfig = ke_getExtensionConfiguration('eb');

  if (!extConfig.Enabled) {
    return;
  }

  if (!extConfig.Config) {
    return;
  }

  const envConfig = ke_eb_getEnvConfig(extConfig);

  if (!envConfig) {
    return;
  }

  const envbar = document.createElement('div');
  envbar.id = 'ke-eb';
  envbar.className = 'ke-eb fullwidth';
  envbar.style.backgroundColor = envConfig.Color;
  masterContainer.parentNode.insertBefore(envbar, masterContainer);

  const envbarlabel = document.createElement('div');
  envbarlabel.id = 'ke-eb label';
  envbarlabel.className = 'ke-eb label';
  envbarlabel.style.backgroundColor = envConfig.Color;
  envbarlabel.innerHTML = `<span>${envConfig.Label}</span>`;
  masterContainer.parentNode.insertBefore(envbarlabel, masterContainer);

  document.title = `${envConfig.Label}-${document.title}`;
}

function ke_eb_getEnvConfig(ebConfig) {
  const envConfig = ebConfig.Config;
  const currentURL = window.location.hostname;
  for (let i = 0; i < envConfig.Environments.length; i++) {
    const configURL = envConfig.Environments[i].URL;
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
