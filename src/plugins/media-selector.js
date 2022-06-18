import { get } from '../infrastructure/api';
import { getExtensionConfig } from '../infrastructure/config';
import { ke_formatBytes } from '../utilities/formatting';
import { getQueryStringValue } from '../utilities/url';

/*
Extension: Media Selector (ms)
Description: Adds the selected images dimensions and file size as a label next to the thumbnail
*/
export async function initialize() {
  const mediaSelectors = document.querySelectorAll('.media-selector-image');
  if (!mediaSelectors.length) {
    return;
  }

  const extConfig = getExtensionConfig('ms');

  if (!extConfig.Enabled) {
    return;
  }

  const mutationObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      const testMutation = mutation;
      if (
        mutation.addedNodes.length === 1 &&
        mutation.addedNodes[0].id !== undefined &&
        mutation.addedNodes[0].id.indexOf('mediaSelector') > 0
      ) {
        ke_ms_addImageSizeLabel(mutation.target);
      }
    });
  });

  mediaSelectors.forEach(async function (ms) {
    await ke_ms_addImageSizeLabel(ms);
  });

  mediaSelectors.forEach(function (ms) {
    mutationObserver.observe(ms, { childList: true });
  });
}

/**
 *
 * @param {HTMLElement} ms
 * @returns {Promise<void>}
 */
async function ke_ms_addImageSizeLabel(ms) {
  ms = ms.parentNode;
  const msinput = ms.querySelector('input');
  if (msinput.value === '') {
    return;
  }
  const imageurl = msinput.value.replaceAll('&amp;', '&');
  let msimage = ms.querySelector('img');
  if (!msimage) {
    return;
  }

  const fileguid = imageurl
    .replace('~/getmedia/', '')
    .replace('/getmedia/', '')
    .substring(0, 36);
  const width = getQueryStringValue('width', imageurl);
  const height = getQueryStringValue('height', imageurl);

  const mediaFile = await get({
    data: 'mediafileinfo',
    fileguid,
    width,
    height,
  });

  const imagedimensions = mediaFile.Width + 'x' + mediaFile.Height;
  const bytes = ke_formatBytes(mediaFile.Size);
  const sizehtml = `<br><b>Size:</b> ${imagedimensions} (${bytes})`;
  const titlehtml =
    mediaFile.Title !== '' ? `<br><b>Title:</b> ${mediaFile.Title}` : '';
  const deschtml =
    mediaFile.Description !== ''
      ? `<br><b>Alt Text:</b> ${mediaFile.Description}`
      : '';

  msimage = document.querySelector(`img[src*="${mediaFile.GUID}"]`).parentNode;

  const mslabel = msimage.querySelector('.ke-ms-label');

  const labelhtmk = sizehtml + titlehtml + deschtml;
  // use create element and append to dom
  if (mslabel) {
    mslabel.innerHTML = labelhtmk;
    return;
  }
  const labelElement = document.createElement('div');
  labelElement.id = mediaFile.GUID;
  labelElement.className = 'ke-ms-label';
  labelElement.title = 'Information provided by Kentico Extensions :)';
  labelElement.innerHTML = labelhtmk;
  msimage.appendChild(labelElement);
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}
