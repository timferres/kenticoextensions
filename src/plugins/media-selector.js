import { get } from '../infrastructure/api';
import { ke_getExtensionConfiguration } from '../infrastructure/config';
import { ke_formatBytes } from '../utilities/formatting';
import { ke_getQueryStringValue } from '../utilities/url';

/*
Extension: Media Selector (ms)
Description: Adds the selected images dimensions and file size as a label next to the thumbnail
*/
document.addEventListener('ke_init_complete', ke_ms_init, false);

async function ke_ms_init() {
  var mediaSelectors = document.querySelectorAll('.media-selector-image');
  if (mediaSelectors.length == 0) {
    return;
  }

  ke_log('init start', true);

  var extConfig = ke_getExtensionConfiguration('ms');

  if (!extConfig.Enabled) {
    return;
  }

  var mutationObserver = new MutationObserver(function (mutations) {
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

  for (var i = 0; i < mediaSelectors.length; i++) {
    var ms = mediaSelectors[i];
    await ke_ms_addImageSizeLabel(ms);
    mutationObserver.observe(ms, { childList: true });
    ke_log('appending information to media selector: ' + ms.id, true);
  }
}

async function ke_ms_addImageSizeLabel(ms) {
  ms = ms.parentNode;
  var msinput = ms.querySelectorAll('input')[0];
  var imageurl = msinput.value;
  var msimage = ms.querySelectorAll('img')[0];
  if (!msimage) {
    return;
  }

  var fileguid = imageurl.substr(imageurl.indexOf('getmedia/') + 9, 36);
  var width = ke_getQueryStringValue('width', imageurl);
  var height = ke_getQueryStringValue('height', imageurl);

  const mediafile = await get({
    data: 'mediafileinfo',
    fileguid,
    width,
    height,
  });

  var imagedimensions = mediaFile.Width + 'x' + mediaFile.Height;
  var labeltext = imagedimensions + ' (' + ke_formatBytes(mediaFile.Size) + ')';

  var msimage = document.querySelectorAll(`img[src*="${mediaFile.GUID}"]`)[0]
    .parentNode;

  var mslabel;
  if (msimage.querySelectorAll('.ke-ms-label').length > 0) {
    mslabel = msimage.querySelectorAll('.ke-ms-label')[0];
  }

  // use create element and append to dom
  if (mslabel != undefined) {
    mslabel.innerHTML = labeltext;
  } else {
    msimage.innerHTML += `&nbsp<div class="ke-ms-label" title="Information provided by Kentico Extensions :)">${labeltext}</div>`;
  }
}
