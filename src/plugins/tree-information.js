import { get } from '../infrastructure/api';
import { getExtensionConfig } from '../infrastructure/config';
import { contenTree, isContentTree } from '../utilities/dom';
import { isCMSDeskFrame } from '../utilities/url';

let treeItems = [];
let treeItemsLookup = {};

/*
Extension: Tree Information (ti)
Description: Displays additional information within the content tree.
*/
export async function initialize() {
  if (!isCMSDeskFrame() || !isContentTree()) {
    return;
  }
  const extConfig = getExtensionConfig('ti');

  if (!extConfig?.Enabled) {
    return;
  }

  const mutationObserver = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      if (
        mutation.addedNodes.length > 0 &&
        mutation.addedNodes[0].className != 'ke-ti-info-div'
      ) {
        setupInfoPanels();
      }
    }
  });

  mutationObserver.observe(contenTree(), {
    childList: true,
    subtree: true,
  });

  // no need to pass current culture since it uses a different domain
  treeItems = await get({ data: 'treeinfo' });

  treeItemsLookup = treeItems.reduce((prev, curr) => {
    prev[curr.NodeID] = curr;

    return prev;
  }, {});

  setupInfoPanels();
}

function setupInfoPanels() {
  const spanElements = document.querySelectorAll("span[id^='target_']");

  const bodyElement = document.querySelector('body');

  for (const span of spanElements) {
    const parentElement = span.parentNode;
    const nodeID = span.id.replace('target_', '');
    const treeItem = treeItemsLookup[nodeID];

    if (!treeItem) {
      continue;
    }

    const currentDiv = document.querySelector(`#ke_ti_node_${nodeID}`);
    let infoDiv = currentDiv ?? createInfoPanel(treeItem);

    infoDiv.onmouseover = function () {
      this.style.display = 'block';
    };
    infoDiv.onmouseout = function () {
      this.style.display = 'none';
    };

    //apend to different div so box doesn't get cut off
    bodyElement.appendChild(infoDiv);

    parentElement.onmouseover = function () {
      // hide all existing info panels
      const elementArray = document.querySelectorAll('.ke-ti-info-div');

      for (const el of document.querySelectorAll('.ke-ti-info-div')) {
        el.style.display = 'none';
      }

      // set position and show
      const spanElement = this.firstElementChild;
      const nodeID = spanElement.id.replace('target_', '');
      const infoDiv = document.querySelector('#ke_ti_node_' + nodeID);
      const clientHeight = document.querySelector(
        `#node_${nodeID}`
      ).clientHeight;

      // content tree splitter
      const contentTreeSplitterRect = document
        .querySelectorAll('.ui-layout-resizer-west')[0]
        .getBoundingClientRect();
      infoDiv.style.top = contentTreeSplitterRect.bottom - 125 - 30 + 'px';
      infoDiv.style.left = contentTreeSplitterRect.right + 10 + 'px';

      //infoDiv.style.top = (spanElement.getBoundingClientRect().top + (clientHeight - 2)) + "px";
      //infoDiv.style.left = spanElement.getBoundingClientRect().left + 20 + "px";
      infoDiv.style.display = '';
    };

    parentElement.onmouseout = function () {
      const nodeID = this.firstElementChild.id.replace('target_', '');
      setTimeout(function () {
        if (
          document.querySelector('#ke_ti_node_' + nodeID).style.display == ''
        ) {
          document.querySelector('#ke_ti_node_' + nodeID).style.display =
            'none';
        }
      }, 3000);
    };
  }
}

function createInfoPanel(treeItem) {
  const infoEl = document.createElement('div');
  infoEl.id = `ke_ti_node_${treeItem.NodeID}`;
  infoEl.className = 'ke-ti-info-div';
  infoEl.style.display = 'none';
  infoEl.innerHTML = `<strong>Node Name:</strong> ${treeItem.NodeName}<br />
<strong>Node ID:</strong> ${treeItem.NodeID}<br />
<strong>Node GUID:</strong> ${treeItem.NodeGUID}<br />
<strong>Node Alias Path:</strong>
<a target='_blank' href='${treeItem.AbsolutePath}'>${treeItem.NodeAliasPath}</a><br />
<strong>Page Type:</strong> ${treeItem.ClassDisplayName} [${treeItem.ClassName}]<br />
<strong>Page Template:</strong> ${treeItem.PageTemplateDisplayName} [${treeItem.PageTemplateCodeName}]`;

  return infoEl;
}
