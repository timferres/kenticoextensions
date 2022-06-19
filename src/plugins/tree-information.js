import { get } from '../infrastructure/api';
import { getExtensionConfig } from '../infrastructure/config';
import { contenTree, isContentTree } from '../utilities/dom';
import { isCMSDeskFrame } from '../utilities/url';

let treeItemsLookup = {};

/*
Extension: Tree Information (ti)
Description: Displays additional information within the content tree.
*/
export function initialize() {
  if (!isCMSDeskFrame() || !isContentTree()) {
    return;
  }
  const extConfig = getExtensionConfig('ti');

  if (!extConfig?.Enabled) {
    return;
  }

  initaliseTreeInfoPanels();

  const mutationObserver = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      if (
        mutation.addedNodes.length > 0 &&
        mutation.addedNodes[0].className !== 'ke-ti-info-div'
      ) {
        setupInfoPanels();
      }
    }
  });

  mutationObserver.observe(contenTree(), {
    childList: true,
    subtree: true,
  });
}

async function initaliseTreeInfoPanels() {
  const treeItems = await get({ data: 'treeinfo' });
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
      const infoDivs = document.querySelectorAll('.ke-ti-info-div');
      for (const el of infoDivs) {
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
      infoDiv.style.top = contentTreeSplitterRect.bottom - 180 - 30 + 'px';
      infoDiv.style.left = contentTreeSplitterRect.right + 10 + 'px';
      infoDiv.style.display = '';
    };

    parentElement.onmouseout = function () {
      const nodeID = this.firstElementChild.id.replace('target_', '');
      setTimeout(function () {
        const tiNode = document.querySelector('#ke_ti_node_' + nodeID);
        if (tiNode.style.display === '') {
          tiNode.style.display = 'none';
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
  infoEl.innerHTML = `
  <strong>Node Alias Path:</strong>
<a target='_blank' href='${treeItem.AbsolutePath}'>${treeItem.NodeAliasPath}</a><br />
  <strong>Node Name:</strong> ${treeItem.NodeName}<br />
<strong>Node ID:</strong> ${treeItem.NodeID}<br />
<strong>Node GUID:</strong> ${treeItem.NodeGUID}<br />
<br />
<strong>Document ID:</strong> ${treeItem.DocumentID}<br />
<strong>Document GUID:</strong> ${treeItem.DocumentGUID}<br />
<br />
<strong>Page Type:</strong> ${treeItem.ClassDisplayName} [${treeItem.ClassName}]<br />
<strong>Page Template:</strong> ${treeItem.PageTemplateDisplayName} [${treeItem.PageTemplateCodeName}]`;
  return infoEl;
}
