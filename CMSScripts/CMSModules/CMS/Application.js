/** 
 * Application helper module
 * Adds functionality for getting data from application context.
 */
cmsdefine(function () {
    var applicationDataRoot = 'CMS',
        applicationDataKey = 'Application',
        app,
        w = window;
    

    if (window[applicationDataRoot] && window[applicationDataRoot][applicationDataKey]) {
        app = window[applicationDataRoot][applicationDataKey];
    }

    return {
        getData: function (key, document) {
            document = document || w;

            if (document[applicationDataRoot] && document[applicationDataRoot][applicationDataKey]) {
                if (key) {
                    return document[applicationDataRoot][applicationDataKey][key];
                } else {
                    return document[applicationDataRoot][applicationDataKey];
                }
            } else {
                return undefined;
            }
        },
        
        setData: function(key, data) {
            if (app && app[key]) {
                app[key] = data;
            }
        },
        
        getWindowLevel: function (win) {
            var l = 0;

            while (win.self !== win.top) {
                // Handle dialog levels separately
                if (this.getData('isDialog', win)) {
                    if (win.dialogLevel == null) {
                        var tw = window.top;
                        if (tw.dialogLevel == null) {
                            tw.dialogLevel = 100;
                        }
                        tw.dialogLevel += 100;
                        win.dialogLevel = tw.dialogLevel;
                    }
                    l += win.dialogLevel;
                }
                win = win.parent;
                l++;
            }

            return l;
        },
        
        reload: function () {
            top.location.reload(true);
        }
    };
});


/*  
KENTICO EXTENSIONS 
Loads a custom stylesheet and javascript file to extend the Kentico CMS
*/
var kextcss = document.createElement("link");
kextcss.type = "text/css";
kextcss.href = '/kenticoextensions/api.ashx?resource=stylesheet';
kextcss.rel = 'stylesheet';
document.body.appendChild(kextcss);

var kextjs = document.createElement("script");
kextjs.type = "application/javascript";
kextjs.src = '/kenticoextensions/api.ashx?resource=javascript';
document.body.appendChild(kextjs);