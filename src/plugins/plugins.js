import { initialize as environmentsBar } from './environments-bar';
import { initialize as documentInformation } from './document-information';
import { initialize as treeInformation } from './tree-information';
import { initialize as staginTasks } from './staging-tasks';

export function initializePlugins() {
  environmentsBar();
  documentInformation();
  treeInformation();
  staginTasks();
}
