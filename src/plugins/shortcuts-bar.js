import { getAppConfig, getExtensionConfig } from '../infrastructure/config';
import { isCMSRootIFrame } from '../utilities/dom';
import { isCMSDashboard } from '../utilities/url';
import { ke_log } from '../utilities/log';
import { ke_getCurrentDateTimeString } from '../utilities/formatting';
import { getCurrentSession } from '../auth/session';
import { get } from '../infrastructure/api';

/*
Extension: Shortcuts Bar (sb)
Description: Adds a navigation bar to the top of the CMS containing links to common functionality
*/
export function initialize() {
  if (isCMSDashboard) {
    ke_sb_observeDashboardUpdates();
  }

  if (!isCMSRootIFrame) {
    return;
  }

  const extConfig = getExtensionConfig('sb');
  if (!extConfig.Enabled) {
    return;
  }

  window.addEventListener('storage', ke_sb_localStorageCheck);
  ke_sb_load();
}

function ke_sb_observeDashboardUpdates() {
  // observe changes to the dashboard page
  // since the dashboard is built dynamically, when the edit button is added, bind an event to it
  var buttonEventBound = false;
  const mutationObserver = new MutationObserver(function (mutations) {
    if (buttonEventBound) return;
    mutations.forEach(function () {
      if (buttonEventBound) return;
      const editButton = document.querySelector(
        'button.btn.btn-edit-mode.btn-default.icon-only'
      );
      if (editButton !== null) {
        editButton.addEventListener('click', ke_se_editDashboardClick, false);
        buttonEventBound = true;
      }
    });
  });

  const dashboardContainer = document.querySelector('body');
  if (dashboardContainer !== null) {
    mutationObserver.observe(dashboardContainer, {
      childList: true,
      subtree: true,
    });
  }
}

function ke_se_editDashboardClick() {
  var addNewAppLink = document.querySelector(
    'a.tile-dead-btn.tile-btn.tile-btn-add'
  );
  var addAppLinkHidden =
    addNewAppLink.parentElement.classList.contains('ng-hide');
  // when the button is clicked after editing the dashboard update the shortcuts bar
  if (!this.className.endsWith('active') && !addAppLinkHidden) {
    // the shortcut bar will update whenever the following local storage item changes
    // this will cause all shortcut bars accross all windows to update
    ke_log('updating shortcuts bar');
    localStorage.setItem(
      'ke-shortcutsbar-lastupdated',
      ke_getCurrentDateTimeString()
    );
  }
}

function ke_sb_localStorageCheck(e) {
  if (e.key === 'ke-shortcutsbar-lastupdated') {
    ke_sb_refresh(false);
  }
}

async function ke_sb_load() {
  const masterContainer = isCMSRootIFrame();
  if (!masterContainer) {
    return;
  }

  const kenavbar = document.createElement('div');
  kenavbar.id = 'ke-nav-bar';
  kenavbar.className = 'ke-nav-bar';
  kenavbar.style.backgroundColor = '#ffffff';

  const kenavbarlabel = document.createElement('div');
  kenavbarlabel.id = 'ke-nav-bar-label';
  kenavbarlabel.className = 'ke-nav-bar-label';
  kenavbarlabel.style.display = 'none';

  const kenavbarinnerlabel = document.createElement('div');
  kenavbarinnerlabel.id = 'ke-nav-bar-inner-label';
  kenavbarinnerlabel.className = 'ke-nav-bar-inner-label';
  kenavbarlabel.appendChild(kenavbarinnerlabel);

  const hideShowLink = document.createElement('a');
  hideShowLink.id = 'ke-nav-bar-hideshow';
  hideShowLink.className = 'ke-nav-bar-hideshow';
  hideShowLink.title = 'Hide Shortcuts Bar';
  hideShowLink.onclick = ke_sb_hideShow;
  const hideShowIcon = document.createElement('i');
  hideShowIcon.className =
    'icon-chevron-right cms-nav-icon-medium icon-hideshow';
  hideShowLink.appendChild(hideShowIcon);

  const menuLink = document.createElement('a');
  menuLink.id = 'ke-nav-bar-menu';
  menuLink.className = 'ke-nav-bar-menu';
  menuLink.title = 'Menu';
  menuLink.onmouseenter = ke_sb_showMenu;
  menuLink.onmouseleave = ke_sb_hideMenu;
  const menuIcon = document.createElement('i');
  menuIcon.className = 'icon-menu cms-nav-icon-medium';
  menuLink.appendChild(menuIcon);

  const menuContent = document.createElement('div');
  menuContent.id = 'ke-nav-bar-menu-content';
  menuContent.className = 'ke-nav-bar-menu-content';
  menuContent.onmouseenter = ke_sb_showMenu;
  menuContent.onmouseleave = ke_sb_hideMenu;

  const configItem = document.createElement('a');
  configItem.id = 'ke-nav-bar-config';
  configItem.className = 'ke-nav-bar-config';
  configItem.innerHTML = 'Config';
  configItem.href = '/kenticoextensions/config.aspx';
  configItem.target = '_blank';
  menuContent.appendChild(configItem);

  const konsoleItem = document.createElement('a');
  konsoleItem.id = 'ke-nav-bar-konsole';
  konsoleItem.className = 'ke-nav-bar-konsole';
  konsoleItem.innerHTML = 'Konsole';
  konsoleItem.href = '#';
  konsoleItem.addEventListener('click', ke_sb_hideShow, false);
  menuContent.appendChild(konsoleItem);

  const konsoleTabItem = document.createElement('a');
  konsoleTabItem.id = 'ke-nav-bar-konsole-tab';
  konsoleTabItem.className = 'ke-nav-bar-konsole-tab';
  konsoleTabItem.innerHTML = 'Konsole Tab';
  konsoleTabItem.href = '/kenticoextensions/konsole.aspx';
  konsoleTabItem.target = '_blank';
  menuContent.appendChild(konsoleTabItem);

  const refreshItem = document.createElement('a');
  refreshItem.id = 'ke-nav-bar-refresh';
  refreshItem.className = 'ke-nav-bar-refresh';
  refreshItem.innerHTML = 'Refresh Nav Bar';
  refreshItem.href = '#';
  refreshItem.addEventListener('click', ke_sb_refresh, false);
  menuContent.appendChild(refreshItem);

  const navBarLine = document.createElement('div');
  navBarLine.className = 'ke-nav-bar-line';
  menuContent.appendChild(navBarLine);

  const liveSiteItem = document.createElement('a');
  liveSiteItem.id = 'ke-nav-bar-livesite';
  liveSiteItem.className = 'ke-nav-bar-livesite';
  liveSiteItem.innerHTML = 'Live Site';
  const { publicSiteURL } = getAppConfig();
  liveSiteItem.href = publicSiteURL;
  liveSiteItem.target = '_blank';
  menuContent.appendChild(liveSiteItem);

  var userid = getCurrentSession().id;
  var shortcutBarItems = await get({ data: 'shortcutbaritems', userid });

  if (shortcutBarItems.length) {
    const shortcutBarElements = ke_sb_build(shortcutBarItems);
    kenavbar.appendChild(shortcutBarElements);
    kenavbar.appendChild(menuLink);
    kenavbar.appendChild(hideShowLink);
    const totalItems = kenavbar.getElementsByTagName('a').length;
    kenavbar.appendChild(menuContent);
    // Need to add 3 to allow for the refresh, hide/show and menu buttons
    kenavbar.style.width = totalItems * 36 + 'px';
    masterContainer.parentNode.insertBefore(kenavbar, masterContainer);

    kenavbarlabel.style.width = kenavbar.style.width;
    masterContainer.parentNode.insertBefore(kenavbarlabel, masterContainer);
  }

  if (!shortcutBarItems.length) {
    const messageDiv = document.createElement('div');
    messageDiv.id = 'ke-nav-bar-message';
    messageDiv.className = 'ke-nav-bar-message';
    messageDiv.innerHTML =
      'Add tiles to your dashboard to populate this shorcuts bar';
    kenavbar.appendChild(messageDiv);
    kenavbar.appendChild(menuLink);
    kenavbar.appendChild(menuContent);
    kenavbar.appendChild(hideShowLink);
    kenavbar.style.width = '500px';
    masterContainer.parentNode.insertBefore(kenavbar, masterContainer);
  }

  ke_log('shortcuts bar loaded');
}

function ke_sb_build(shortcutBarItems) {
  const shortcutsSpan = document.createElement('span');
  shortcutsSpan.id = 'ke-nav-bar-shortcuts';
  shortcutsSpan.className = 'ke-nav-bar-shortcuts';

  shortcutBarItems.forEach(function (sbi) {
    const shortcutLink = document.createElement('a');
    shortcutLink.id = `ke-nav-bar-${sbi.name.toLowerCase().replace(' ', '-')}`;
    shortcutLink.dataset.label = sbi.name;
    shortcutLink.href = '#' + sbi.guid;

    shortcutLink.onmouseover = function () {
      const navbarlabel = document.getElementById('ke-nav-bar-label');
      const navbarinnerlabel = navbarlabel.firstChild;
      navbarinnerlabel.innerHTML = this.dataset.label;
      navbarlabel.style.display = '';
    };
    shortcutLink.onmouseout = function () {
      const navbarlabel = document.getElementById('ke-nav-bar-label');
      navbarlabel.style.display = 'none';
    };

    const shortcutIcon = document.createElement('i');
    shortcutIcon.className = `${
      sbi.iconClass
    } cms-nav-icon-medium icon-${sbi.iconColor.toLowerCase()}`;

    shortcutLink.appendChild(shortcutIcon);
    shortcutsSpan.appendChild(shortcutLink);
  });

  return shortcutsSpan;
}

function ke_sb_refresh(updateLocalStorage) {
  const masterContainer = isCMSRootIFrame();
  if (!masterContainer) {
    return;
  }

  ke_log('shortcuts bar refreshing');

  var { id } = getCurrentSession();
  localStorage.removeItem('data=shortcutbaritems&userid=' + id);

  const shortcutsBar = document.getElementById('ke-nav-bar');
  if (shortcutsBar) {
    masterContainer.parentNode.removeChild(shortcutsBar);
  }

  ke_sb_load();

  if (updateLocalStorage) {
    localStorage.setItem(
      'ke-shortcutsbar-lastupdated',
      ke_getCurrentDateTimeString()
    );
  }
}

function ke_sb_hideShow() {
  const shortcutsBar = document.getElementById('ke-nav-bar');

  var elementToHideShow = document.getElementById('ke-nav-bar-shortcuts');
  if (!elementToHideShow) {
    elementToHideShow = document.getElementById('ke-nav-bar-message');
  }
  if (!elementToHideShow) {
    return;
  }

  const hideShowLink = document.getElementById('ke-nav-bar-hideshow');
  const hideShowIcon = hideShowLink.getElementsByClassName('icon-hideshow')[0];

  if (hideShowIcon.classList.contains('icon-chevron-right')) {
    shortcutsBarWidth = shortcutsBar.style.width;
    hideShowIcon.className = hideShowIcon.className.replace(
      'icon-chevron-right',
      'icon-chevron-left'
    );
    hideShowLink.title = 'Show Shortcuts Bar';
    elementToHideShow.style.display = 'none';
    shortcutsBar.style.backgroundColor = '';
    return;
  }

  hideShowIcon.className = hideShowIcon.className.replace(
    'icon-chevron-left',
    'icon-chevron-right'
  );
  hideShowLink.title = 'Hide Shortcuts Bar';
  elementToHideShow.style.display = '';
  shortcutsBar.style.backgroundColor = '#ffffff';
}

function ke_sb_showMenu() {
  document.getElementById('ke-nav-bar-menu-content').style.display = 'block';
}

function ke_sb_hideMenu() {
  document.getElementById('ke-nav-bar-menu-content').style.display = 'none';
}
