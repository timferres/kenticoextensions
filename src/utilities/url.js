/**
 *
 * @param {string} name
 * @param {string} url
 * @returns {string | null}
 */
export function getQueryStringValue(name, url) {
  if (!url) {
    url = window.location.href;
  }

  const urlobj = getURL(url);
  if (!urlobj) {
    return null;
  }
  const urlsearch = urlobj.search;
  const params = new URLSearchParams(urlsearch);

  return params.get(name);
}

function getURL(value) {
  try {
    if (value.startsWith('http')) {
      return new URL(value);
    }
    return new URL(value, document.baseURI);
  } catch (_) {
    return null;
  }
}

export function isLoginPage() {
  return window.location.href.includes('/CMSPages/logon.aspx');
}

export function isPageInfoFrame() {
  return window.location.href.includes(
    '/CMSModules/AdminControls/Pages/UIPage.aspx'
  );
}

export function isCMSDeskFrame() {
  return window.location.href.includes(
    '/CMSModules/Content/CMSDesk/Default.aspx'
  );
}

export function isCMSDashboard() {
  return window.location.href.includes(
    '/CMSModules/ApplicationDashboard/ApplicationDashboard.aspx'
  );
}

export function isStagingFrame() {
  return (
    window.location.href.includes(
      '/CMSModules/Staging/Tools/AllTasks/Tasks.aspx'
    ) ||
    window.location.href.includes(
      '/CMSModules/Staging/Tools/Tasks/Tasks.aspx'
    ) ||
    window.location.href.includes(
      '/CMSModules/Staging/Tools/Objects/Tasks.aspx'
    ) ||
    window.location.href.includes('/CMSModules/Staging/Tools/Data/Tasks.aspx')
  );
}
