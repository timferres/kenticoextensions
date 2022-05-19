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

  const params = new URLSearchParams(new URL(url).search);

  return params.get(name);
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
