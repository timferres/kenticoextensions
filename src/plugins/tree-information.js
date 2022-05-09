import { get } from '../infrastructure/api';
import { ke_getExtensionConfiguration } from '../infrastructure/config';

/*
Extension: Tree Information (ti)
Description: Displays additional information within the content tree.
*/
document.addEventListener('ke_init_complete', initialize, false);

async function initialize() {
  if (
    !window.location.href.includes(
      '/CMSModules/Content/CMSDesk/Default.aspx'
    ) ||
    !document.querySelectorAll('.ContentTree').length
  ) {
    return;
  }
  const extConfig = ke_getExtensionConfiguration('ti');

  if (!extConfig?.Enabled) {
    return;
  }

  const mutationObserver = new MutationObserver(ke_ti_mutationHandler);

  const contentTree = document.querySelectorAll(
    "div[id$='contentcontrolpanel']"
  )[0];
  mutationObserver.observe(contentTree, { childList: true, subtree: true });

  // no need to pass current culture since it uses a different domain
  const treeItems = await get({ data: 'treeinfo' });

  ke_ti_loadCallback(treeItems);
}

function ke_ti_mutationHandler(mutations) {
  for (const i = 0; i < mutations.length; i++) {
    const mutation = mutations[i];
    if (
      mutation.addedNodes.length > 0 &&
      mutation.addedNodes[0].className != 'ke-ti-info-div'
    ) {
      const treeItems = await get('data=treeinfo', false);

      ke_ti_loadCallback(treeItems);
    }
  }
}

function ke_ti_loadCallback(treeItems) {
  const spanElements = document.querySelectorAll("span[id^='target_']");

  const bodyElement = document.querySelectorAll('body')[0];

  for (const i = 0; i < spanElements.length; i++) {
    const parentElement = spanElements[i].parentNode;
    const nodeID = spanElements[i].id.replace('target_', '');
    const treeItem = ke_ti_getTreeItemInfo(treeItems, nodeID);

    if (treeItem == null) continue;

    const currentDiv = document.querySelector('#ke_ti_node_' + nodeID);
    const infoDiv = currentDiv;

    if (infoDiv == undefined) {
      const infoDiv = document.createElement('div');
      infoDiv.id = 'ke_ti_node_' + nodeID;
      infoDiv.className = 'ke-ti-info-div';
      infoDiv.style.display = 'none';
      infoDiv.innerHTML =
        '<strong>Node Name:</strong> ' + treeItem.NodeName + '<br />';
      infoDiv.innerHTML +=
        '<strong>Node ID:</strong> ' + treeItem.NodeID + '<br />';
      infoDiv.innerHTML +=
        '<strong>Node GUID:</strong> ' + treeItem.NodeGUID + '<br />';
      infoDiv.innerHTML +=
        "<strong>Node Alias Path:</strong> <a target='_blank' href='" +
        treeItem.AbsolutePath +
        "'>" +
        treeItem.NodeAliasPath +
        '</a><br />';
      infoDiv.innerHTML +=
        '<strong>Page Type:</strong> ' +
        treeItem.ClassDisplayName +
        ' [' +
        treeItem.ClassName +
        ']<br />';
      infoDiv.innerHTML +=
        '<strong>Page Template:</strong> ' +
        treeItem.PageTemplateDisplayName +
        ' [' +
        treeItem.PageTemplateCodeName +
        ']';
    }

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
      for (const i = 0; i < elementArray.length; i++) {
        elementArray[i].style.display = 'none';
      }

      // set position and show
      const spanElement = this.firstElementChild;
      const nodeID = spanElement.id.replace('target_', '');
      const infoDiv = document.querySelector('#ke_ti_node_' + nodeID);
      const clientHeight = document.querySelector(
        '#node_' + nodeID
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

function ke_ti_getTreeItemInfo(treeItems, NodeID) {
  for (const i = 0; i < treeItems.length; i++) {
    if (treeItems[i].NodeID == NodeID) {
      return treeItems[i];
    }
  }
  return null;
}
