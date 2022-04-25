import { ke_getConfiguration } from './infrastructure/config';
import { ke_checkUserDisabled, ke_checkUserEnabled } from './auth/session';

/*
Kentico Extensions Common
Description: Common methods required by multiple Kentico Extensions
*/
var ke_init_complete = ke_init();

const { Enabled } = ke_getConfiguration();

if (Enabled && ke_checkUserEnabled() && ke_checkUserDisabled() === false) {
  // initalise all the extensions
  document.dispatchEvent(ke_init_complete);
}
