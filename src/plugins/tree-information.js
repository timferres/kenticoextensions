import { ke_getExtensionConfiguration } from '../infrastructure/config';

/*
Extension: Tree Information (ti)
Description: Displays additional information within the content tree.
*/
document.addEventListener('ke_init_complete', ke_ti_init, false);

async function ke_ti_init() {
  if (
    !window.location.href.includes(
      '/CMSModules/Content/CMSDesk/Default.aspx'
    ) ||
    !document.querySelectorAll('.ContentTree').length
  ) {
    return;
  }
  var extConfig = ke_getExtensionConfiguration('ti');

  if (!extConfig.Enabled) {
    return;
  }

  var mutationObserver = new MutationObserver(ke_ti_mutationHandler);

  var contentTree = document.querySelectorAll(
    "div[id$='contentcontrolpanel']"
  )[0];
  mutationObserver.observe(contentTree, { childList: true, subtree: true });

  // no need to pass current culture since it uses a different domain
  const treeItems = await ke_getAPIDataAsync({ data: 'treeinfo' });

  ke_ti_loadCallback(treeItems);
}

function ke_ti_mutationHandler(mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var mutation = mutations[i];
    if (
      mutation.addedNodes.length > 0 &&
      mutation.addedNodes[0].className != 'ke-ti-info-div'
    ) {
      ke_log('content tree muation detected');
      ke_getAPIDataAsync('data=treeinfo', false, ke_ti_loadCallback, true);
    }
  }
}

function ke_ti_loadCallback(treeItems) {
  var spanElements = document.querySelectorAll("span[id^='target_']");

  var bodyElement = document.querySelectorAll('body')[0];

  for (var i = 0; i < spanElements.length; i++) {
    var parentElement = spanElements[i].parentNode;
    var nodeID = spanElements[i].id.replace('target_', '');
    var treeItem = ke_ti_getTreeItemInfo(treeItems, nodeID);

    if (treeItem == null) continue;

    var currentDiv = document.querySelector('#ke_ti_node_' + nodeID);
    var infoDiv = currentDiv;

    if (infoDiv == undefined) {
      var infoDiv = document.createElement('div');
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
      var elementArray = document.querySelectorAll('.ke-ti-info-div');
      for (var i = 0; i < elementArray.length; i++) {
        elementArray[i].style.display = 'none';
      }

      // set position and show
      var spanElement = this.firstElementChild;
      var nodeID = spanElement.id.replace('target_', '');
      var infoDiv = document.querySelector('#ke_ti_node_' + nodeID);
      var clientHeight = document.querySelector('#node_' + nodeID).clientHeight;

      // content tree splitter
      var contentTreeSplitterRect = document
        .querySelectorAll('.ui-layout-resizer-west')[0]
        .getBoundingClientRect();
      infoDiv.style.top = contentTreeSplitterRect.bottom - 125 - 30 + 'px';
      infoDiv.style.left = contentTreeSplitterRect.right + 10 + 'px';

      //infoDiv.style.top = (spanElement.getBoundingClientRect().top + (clientHeight - 2)) + "px";
      //infoDiv.style.left = spanElement.getBoundingClientRect().left + 20 + "px";
      infoDiv.style.display = '';
    };
    parentElement.onmouseout = function () {
      var nodeID = this.firstElementChild.id.replace('target_', '');
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
  for (var i = 0; i < treeItems.length; i++) {
    if (treeItems[i].NodeID == NodeID) {
      return treeItems[i];
    }
  }
  return null;
}
