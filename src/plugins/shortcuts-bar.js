import { ke_getConfiguration } from '../infrastructure/config';

/*
Extension: Shortcuts Bar (sb)
Description: Adds a navigation bar to the top of the CMS containing links to common functionality
*/
var ke_sb_initalised = false;
document.addEventListener('ke_init_complete', ke_sb_init, false);

function ke_sb_init() {
  if (ke_sb_initalised === true) return;

  ke_sb_observeDashboardUpdates();

  var masterContainer = document.getElementsByClassName('CMSDeskContent')[0];
  if (masterContainer === undefined) {
    return;
  }

  ke_log('shortcuts bar initalising');

  var extConfig = ke_getExtensionConfiguration('sb');
  if (extConfig == undefined) {
    ke_log('configuration not found');
    return;
  }

  if (extConfig.Enabled == false) {
    return;
  }

  window.addEventListener('storage', ke_sb_localStorageCheck);
  ke_sb_load(false);

  ke_sb_initalised = true;
}

function ke_sb_observeDashboardUpdates() {
  // if the current window is the kentico dashboard
  if (
    window.location.href.indexOf(
      '/CMSModules/ApplicationDashboard/ApplicationDashboard.aspx'
    ) != -1
  ) {
    // observe changes to the dashboard page
    // since the dashboard is built dynamically, when the edit button is added, bind an event to it
    var buttonEventBound = false;
    var mutationObserver = new MutationObserver(function (mutations) {
      if (buttonEventBound) return;
      mutations.forEach(function (mutation) {
        if (buttonEventBound) return;
        var editButton = document.getElementsByClassName(
          'btn btn-edit-mode btn-default icon-only'
        )[0];
        if (editButton !== undefined) {
          editButton.addEventListener(
            'click',
            function () {
              // when the button is clicked after editing the dashboard update the shortcuts bar
              if (this.className.endsWith('active') == false) {
                // the shortcut bar will update whenever the following local storage item changes
                // this will cause all shortcut bars accross all windows to update
                ke_log('updating shortcuts bar');
                var cdts = ke_getCurrentDateTimeString();
                localStorage.setItem(
                  'kenticoextensions-shortcutsbar-lastupdated',
                  cdts
                );
              }
            },
            false
          );
          buttonEventBound = true;
        }
      });
    });

    var dashboardContainer = document.getElementsByTagName('body')[0];
    mutationObserver.observe(dashboardContainer, {
      childList: true,
      subtree: true,
    });
  }
}

function ke_sb_localStorageCheck(e) {
  if (e.key == 'kenticoextensions-shortcutsbar-lastupdated') {
    ke_sb_refresh(false);
  }
}

function ke_sb_load(refreshData) {
  var qsParams = 'data=shortcutbaritems&userid=' + ke_UserID;
  ke_getAPIDataAsync(qsParams, refreshData, ke_sb_loadCallback, true);
}

function ke_sb_loadCallback(shortcutBarItems) {
  const { publicSiteURL } = ke_getConfiguration();

  var masterContainer = document.getElementsByClassName('CMSDeskContent')[0];
  if (masterContainer === undefined) {
    return;
  }

  var kenavbar = document.createElement('div');
  kenavbar.id = 'kentico-extensions-nav-bar';
  kenavbar.className = 'kentico-extensions-nav-bar';
  kenavbar.style.backgroundColor = '#ffffff';

  var kenavbarlabel = document.createElement('div');
  kenavbarlabel.id = 'kentico-extensions-nav-bar-label';
  kenavbarlabel.className = 'kentico-extensions-nav-bar-label';
  kenavbarlabel.style.display = 'none';

  var kenavbarinnerlabel = document.createElement('div');
  kenavbarinnerlabel.id = 'kentico-extensions-nav-bar-inner-label';
  kenavbarinnerlabel.className = 'kentico-extensions-nav-bar-inner-label';
  kenavbarlabel.appendChild(kenavbarinnerlabel);

  var hideShowLink = document.createElement('a');
  hideShowLink.id = 'kentico-extensions-nav-bar-hideshow';
  hideShowLink.className = 'kentico-extensions-nav-bar-hideshow';
  hideShowLink.title = 'Hide Shortcuts Bar';
  hideShowLink.onclick = ke_sb_hideShow;
  var hideShowIcon = document.createElement('i');
  hideShowIcon.className =
    'icon-chevron-right cms-nav-icon-medium icon-hideshow';
  hideShowLink.appendChild(hideShowIcon);

  var menuLink = document.createElement('a');
  menuLink.id = 'kentico-extensions-nav-bar-menu';
  menuLink.className = 'kentico-extensions-nav-bar-menu';
  menuLink.title = 'Menu';
  menuLink.onmouseenter = ke_sb_showMenu;
  menuLink.onmouseleave = ke_sb_hideMenu;
  var menuIcon = document.createElement('i');
  menuIcon.className = 'icon-menu cms-nav-icon-medium';
  menuLink.appendChild(menuIcon);

  var menuContent = document.createElement('div');
  menuContent.id = 'kentico-extensions-nav-bar-menu-content';
  menuContent.className = 'kentico-extensions-nav-bar-menu-content';
  menuContent.onmouseenter = ke_sb_showMenu;
  menuContent.onmouseleave = ke_sb_hideMenu;

  var configItem = document.createElement('a');
  configItem.id = 'kentico-extensions-nav-bar-config';
  configItem.className = 'kentico-extensions-nav-bar-config';
  configItem.innerHTML = 'Config';
  configItem.href = '/kenticoextensions/config.aspx';
  configItem.target = '_blank';
  menuContent.appendChild(configItem);

  var konsoleItem = document.createElement('a');
  konsoleItem.id = 'kentico-extensions-nav-bar-konsole';
  konsoleItem.className = 'kentico-extensions-nav-bar-konsole';
  konsoleItem.innerHTML = 'Konsole';
  konsoleItem.href = '#';
  konsoleItem.addEventListener(
    'click',
    function () {
      ke_ko_showHide();
    },
    false
  );
  menuContent.appendChild(konsoleItem);

  var konsoleTabItem = document.createElement('a');
  konsoleTabItem.id = 'kentico-extensions-nav-bar-konsole-tab';
  konsoleTabItem.className = 'kentico-extensions-nav-bar-konsole-tab';
  konsoleTabItem.innerHTML = 'Konsole Tab';
  konsoleTabItem.href = '/kenticoextensions/konsole.aspx';
  konsoleTabItem.target = '_blank';
  menuContent.appendChild(konsoleTabItem);

  var refreshItem = document.createElement('a');
  refreshItem.id = 'kentico-extensions-nav-bar-refresh';
  refreshItem.className = 'kentico-extensions-nav-bar-refresh';
  refreshItem.innerHTML = 'Refresh Nav Bar';
  refreshItem.href = '#';
  refreshItem.addEventListener(
    'click',
    function () {
      ke_sb_refresh(true);
    },
    false
  );
  menuContent.appendChild(refreshItem);

  var navBarLine = document.createElement('div');
  navBarLine.className = 'kentico-extensions-nav-bar-line';
  menuContent.appendChild(navBarLine);

  var liveSiteItem = document.createElement('a');
  liveSiteItem.id = 'kentico-extensions-nav-bar-livesite';
  liveSiteItem.className = 'kentico-extensions-nav-bar-livesite';
  liveSiteItem.innerHTML = 'Live Site';
  liveSiteItem.href = publicSiteURL;
  liveSiteItem.target = '_blank';
  menuContent.appendChild(liveSiteItem);

  if (shortcutBarItems.length > 0) {
    var shortcutBarElements = ke_sb_build(shortcutBarItems);
    kenavbar.appendChild(shortcutBarElements);
    kenavbar.appendChild(menuLink);
    kenavbar.appendChild(hideShowLink);
    var totalItems = kenavbar.getElementsByTagName('a').length;
    kenavbar.appendChild(menuContent);
    // Need to add 3 to allow for the refresh, hide/show and menu buttons
    kenavbar.style.width = totalItems * 36 + 'px';
    masterContainer.parentNode.insertBefore(kenavbar, masterContainer);

    kenavbarlabel.style.width = kenavbar.style.width;
    masterContainer.parentNode.insertBefore(kenavbarlabel, masterContainer);
  } else {
    var messageDiv = document.createElement('div');
    messageDiv.id = 'kentico-extensions-nav-bar-message';
    messageDiv.className = 'kentico-extensions-nav-bar-message';
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
  var shortcutsSpan = document.createElement('span');
  shortcutsSpan.id = 'kentico-extensions-nav-bar-shortcuts';
  shortcutsSpan.className = 'kentico-extensions-nav-bar-shortcuts';

  for (var i = 0; i < shortcutBarItems.length; i++) {
    var shortcutLink = document.createElement('a');
    shortcutLink.id =
      'kentico-extensions-nav-bar-' +
      shortcutBarItems[i].name.toLowerCase().replace(' ', '-');
    // title not required with custom mouseover shortcut item name display
    //shortcutLink.title = shortcutBarItems[i].name;
    shortcutLink.name = shortcutBarItems[i].name;
    shortcutLink.href = '#' + shortcutBarItems[i].guid;

    shortcutLink.onmouseover = function () {
      var navbarinnerlabel = document.getElementById(
        'kentico-extensions-nav-bar-inner-label'
      );
      navbarinnerlabel.innerHTML = this.name;
      var navbarlabel = document.getElementById(
        'kentico-extensions-nav-bar-label'
      );
      navbarlabel.style.display = '';
    };
    shortcutLink.onmouseout = function () {
      var navbarlabel = document.getElementById(
        'kentico-extensions-nav-bar-label'
      );
      navbarlabel.style.display = 'none';
    };

    var shortcutIcon = document.createElement('i');
    shortcutIcon.className =
      shortcutBarItems[i].iconClass +
      ' cms-nav-icon-medium icon-' +
      shortcutBarItems[i].iconColor.toLowerCase();

    shortcutLink.appendChild(shortcutIcon);
    shortcutsSpan.appendChild(shortcutLink);
  }

  return shortcutsSpan;
}

function ke_sb_refresh(updateLocalStorage) {
  var masterContainer = document.getElementsByClassName('CMSDeskContent')[0];
  if (masterContainer === undefined) {
    return;
  }

  ke_log('shortcuts bar refreshing');

  localStorage.removeItem('data=shortcutbaritems&userid=' + ke_UserID);

  var shortcutsBar = document.getElementById('kentico-extensions-nav-bar');
  masterContainer.parentNode.removeChild(shortcutsBar);

  ke_sb_load(true);

  if (updateLocalStorage == true) {
    var cdts = ke_getCurrentDateTimeString();
    localStorage.setItem('kenticoextensions-shortcutsbar-lastupdated', cdts);
  }
}

function ke_sb_hideShow() {
  var shortcutsBar = document.getElementById('kentico-extensions-nav-bar');

  var elementToHideShow = document.getElementById(
    'kentico-extensions-nav-bar-shortcuts'
  );
  if (elementToHideShow == undefined) {
    elementToHideShow = document.getElementById(
      'kentico-extensions-nav-bar-message'
    );
  }
  if (elementToHideShow == undefined) return;

  var hideShowLink = document.getElementById(
    'kentico-extensions-nav-bar-hideshow'
  );
  var hideShowIcon = hideShowLink.getElementsByClassName('icon-hideshow')[0];
  if (hideShowIcon.className.indexOf('icon-chevron-right') > -1) {
    shortcutsBarWidth = shortcutsBar.style.width;
    hideShowIcon.className = hideShowIcon.className.replace(
      'icon-chevron-right',
      'icon-chevron-left'
    );
    hideShowLink.title = 'Show Shortcuts Bar';
    elementToHideShow.style.display = 'none';
    shortcutsBar.style.backgroundColor = '';
  } else {
    hideShowIcon.className = hideShowIcon.className.replace(
      'icon-chevron-left',
      'icon-chevron-right'
    );
    hideShowLink.title = 'Hide Shortcuts Bar';
    elementToHideShow.style.display = '';
    shortcutsBar.style.backgroundColor = '#ffffff';
  }
}

function ke_sb_showMenu() {
  document.getElementById(
    'kentico-extensions-nav-bar-menu-content'
  ).style.display = 'block';
}

function ke_sb_hideMenu() {
  document.getElementById(
    'kentico-extensions-nav-bar-menu-content'
  ).style.display = 'none';
}
