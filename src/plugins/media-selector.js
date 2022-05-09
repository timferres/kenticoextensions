import { get } from '../infrastructure/api';
import { ke_getExtensionConfiguration } from '../infrastructure/config';
import { ke_formatBytes } from '../utilities/formatting';
import { ke_getQueryStringValue } from '../utilities/url';

/*
Extension: Media Selector (ms)
Description: Adds the selected images dimensions and file size as a label next to the thumbnail
*/
document.addEventListener('ke_init_complete', initialize, false);

async function initialize() {
  const mediaSelectors = document.querySelectorAll('.media-selector-image');
  if (!mediaSelectors.length) {
    return;
  }

  const extConfig = ke_getExtensionConfiguration('ms');

  if (!extConfig.Enabled) {
    return;
  }

  const mutationObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (
        mutation.addedNodes.length == 1 &&
        mutation.addedNodes[0].id != undefined &&
        mutation.addedNodes[0].id.indexOf('mediaSelector') > 0
      ) {
        ke_ms_addImageSizeLabel(mutation.target);
      }
    });
  });

  for (const i = 0; i < mediaSelectors.length; i++) {
    const ms = mediaSelectors[i];

    await ke_ms_addImageSizeLabel(ms);

    mutationObserver.observe(ms, { childList: true });
  }
}

/**
 *
 * @param {HTMLElement} ms
 * @returns {Promise<void>}
 */
async function ke_ms_addImageSizeLabel(ms) {
  ms = ms.parentNode;
  const msinput = ms.querySelectorAll('input')[0];
  const imageurl = msinput.value;
  let msimage = ms.querySelectorAll('img')[0];
  if (!msimage) {
    return;
  }

  const fileguid = imageurl.substr(imageurl.indexOf('getmedia/') + 9, 36);
  const width = ke_getQueryStringValue('width', imageurl);
  const height = ke_getQueryStringValue('height', imageurl);

  const mediafile = await get({
    data: 'mediafileinfo',
    fileguid,
    width,
    height,
  });

  const imagedimensions = mediafile.Width + 'x' + mediafile.Height;
  const labeltext =
    imagedimensions + ' (' + ke_formatBytes(mediafile.Size) + ')';

  msimage = document.querySelectorAll(`img[src*="${mediafile.GUID}"]`)[0]
    .parentNode;

  const allLabels = msimage.querySelectorAll('.ke-ms-label');

  const mslabel =
    allLabels.length > 0
      ? msimage.querySelectorAll('.ke-ms-label')[0]
      : undefined;

  // use create element and append to dom
  if (mslabel) {
    mslabel.innerHTML = labeltext;
  } else {
    msimage.innerHTML += `&nbsp<div class="ke-ms-label" title="Information provided by Kentico Extensions :)">${labeltext}</div>`;
  }
}
