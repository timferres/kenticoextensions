import { initialize as environmentsBar } from './environments-bar';
import { initialize as documentInformation } from './document-information';
import { initialize as treeInformation } from './tree-information';

export function initializePlugins() {
  environmentsBar();
  documentInformation();
  treeInformation();
}
