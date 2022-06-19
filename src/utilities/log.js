import { getAppConfig, getExtensionConfig } from '../infrastructure/config';

export function ke_log(message, outputpathname) {
  const { ConsoleLogging } = getAppConfig();

  if (outputpathname == undefined) {
    outputpathname = false;
  }
  var callingFunction = arguments.callee.caller.name;

  // if the calling function matches ke_xx_ or ke_xxx_
  if (callingFunction.match(/^ke_.{2,3}_/) != null) {
    var extCodeStart = callingFunction.indexOf('_') + 1;
    var extCodeEnd = callingFunction.substr(extCodeStart).indexOf('_');
    var extCode = callingFunction.substr(extCodeStart, extCodeEnd);
    var extConfig = getExtensionConfig(extCode);
    if (extConfig != undefined && extConfig.ConsoleLogging == false) {
      return;
    }
  }

  if (callingFunction.startsWith('ke_') && ConsoleLogging == false) {
    return;
  }

  if (callingFunction == '') {
    callingFunction = 'ke_anonymous';
  }

  var currentDate = new Date();
  var dateString = currentDate.toISOString().substr(0, 19).replace('T', ' ');
  var output = dateString + ' ' + callingFunction + ': ' + message;
  if (outputpathname) {
    output += '\n' + window.location.pathname;
  }
  console.log(output);
}
