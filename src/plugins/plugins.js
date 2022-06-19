import { initialize as environmentsBar } from './environments-bar';
import { initialize as documentInformation } from './document-information';
import { initialize as treeInformation } from './tree-information';
import { initialize as staginTasks } from './staging-tasks';
import { initialize as shortcutsBar } from './shortcuts-bar';
import { initialize as mediaSelector } from './media-selector';
import { initialize as uiRestrictions } from './ui-restrictions';

export function initializePlugins() {
  environmentsBar();
  documentInformation();
  treeInformation();
  staginTasks();
  shortcutsBar();
  mediaSelector();
  uiRestrictions();
}
