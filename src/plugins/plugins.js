import { initialize as environmentsBar } from './environments-bar';
import { initialize as documentInformation } from './document-information';

export function initializePlugins() {
  environmentsBar();
  documentInformation();
}
