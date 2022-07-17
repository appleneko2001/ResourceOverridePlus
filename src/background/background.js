/* globals chrome, bgapp, match */
{
    bgapp.ruleDomains = {};
    bgapp.syncFunctions = [];

    const simpleError = bgapp.util.simpleError;

    // Called when the user clicks on the browser action icon.
    chrome.browserAction.onClicked.addListener(function() {
        // open or focus options page.
        const optionsUrl = chrome.runtime.getURL("src/ui/devtoolstab.html");
        chrome.tabs.query({}, function(extensionTabs) {
            let found = false;
            for (let i = 0, len = extensionTabs.length; i < len; i++) {
                if (optionsUrl === extensionTabs[i].url) {
                    found = true;
                    chrome.tabs.update(extensionTabs[i].id, {selected: true});
                    break;
                }
            }
            if (found === false) {
                chrome.tabs.create({url: optionsUrl});
            }
        });
    });

    const syncAllInstances = function() {
        // Doing this weird dance because I cant figure out how to
        // send data from this script to the dev tools script.
        // Nothing seems to work (even the examples!).
        bgapp.syncFunctions.forEach(function(fn) {
            try {
                fn();
            } catch (e) { /**/ }
        });
        bgapp.syncFunctions = [];
    };

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

        bgapp.debug.verbose(() => `Receive internal process command: ${request.action}`)

        switch (request.action) {
            case "saveDomain":
                bgapp.mainStorage.put(request.data)
                    .then(syncAllInstances)
                    .catch(simpleError);
                bgapp.ruleDomains[request.data.id] = request.data;
                break;

            case "getDomains":
                bgapp.mainStorage.getAll().then(function (domains) {
                    sendResponse(domains || []);
                }).catch(simpleError);
                break;

            case "deleteDomain":
                bgapp.mainStorage.delete(request.id)
                    .then(syncAllInstances)
                    .catch(simpleError);
                delete bgapp.ruleDomains[request.id];
                break;

            case "import":
                let maxId = 0;
                for (const id in bgapp.ruleDomains) {
                    maxId = Math.max(maxId, parseInt(id.substring(1)));
                }
                maxId++;
                Promise.all(request.data.map(function (domainData) {
                    // dont overwrite any pre-existing domains.
                    domainData.id = "d" + maxId++;
                    bgapp.ruleDomains[domainData.id] = domainData;
                    return bgapp.mainStorage.put(domainData);
                }))
                    .then(syncAllInstances)
                    .catch(simpleError);
                break;

            case "makeGetRequest":
                const xhr = new XMLHttpRequest();
                xhr.open("GET", request.url, true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        sendResponse(xhr.responseText);
                    }
                };
                xhr.send();
                break;

            case "setSetting":
                localStorage[request.setting] = request.value;
                break;

            case "getSetting":
                sendResponse(localStorage[request.setting]);
                break;

            case "syncMe":
                bgapp.syncFunctions.push(sendResponse);
                break;

            case "match":
                // standard pattern match
                if(!request.useRegex){
                    sendResponse(match(request.domainUrl, request.windowUrl).matched);
                }
                // regex pattern match
                else{
                    sendResponse(matchRegex(request.domainUrl, request.windowUrl));
                }
                break;

            case "extractMimeType":
                sendResponse(bgapp.extractMimeType(request.fileName, request.file));
                break;
        }

        // !!!Important!!! Need to return true for sendResponse to work.
        return true;
    });

    chrome.webRequest.onBeforeRequest.addListener(function(details) {
        if (!bgapp.requestIdTracker.has(details.requestId)) {
            if (details.tabId > -1) {
                let tabUrl = bgapp.tabUrlTracker.getUrlFromId(details.tabId);
                if (details.type === "main_frame") {
                    // a new tab must have just been created.
                    tabUrl = details.url;
                }
                if (tabUrl) {
                    const result = bgapp.handleRequest(details.url, tabUrl, details.tabId, details.requestId);
                    if (result) {
                        // make sure we don't try to redirect again.
                        bgapp.requestIdTracker.push(details.requestId);
                    }
                    return result;
                }
            }
        }
    }, {
        urls: ["<all_urls>"]
    }, ["blocking"]);

    chrome.webRequest.onHeadersReceived.addListener(bgapp.makeHeaderHandler("response"), {
        urls: ["<all_urls>"]
    }, ["blocking", "responseHeaders"]);

    chrome.webRequest.onBeforeSendHeaders.addListener(bgapp.makeHeaderHandler("request"), {
        urls: ["<all_urls>"]
    }, ["blocking", "requestHeaders"]);

    //init settings
    if (localStorage.devTools === undefined) {
        localStorage.devTools = "true";
    }
    if (localStorage.showSuggestions === undefined) {
        localStorage.showSuggestions = "true";
    }
    if (localStorage.showLogs === undefined) {
        localStorage.showLogs = "false";
    }

    // init domain storage
    bgapp.mainStorage.getAll().then(function(domains) {
        if (domains) {
            domains.forEach(function(domainObj) {
                bgapp.ruleDomains[domainObj.id] = domainObj;
            });
        }
    }).catch(simpleError);

	bgapp.debug.log("Background is initialized.");
}
