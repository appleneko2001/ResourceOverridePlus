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

    function PostIpcProcedure(isSuccess, obj){
        if(!(isSuccess === true || isSuccess === false))
            throw "isSuccess property is undefined or had wrong value.";

        if(obj === null || obj === undefined)
            throw "obj shouldn't be empty.";

        obj.isSuccess = isSuccess;

        return obj;
    }

    const ExperimentIPCProcedure = function (req, sender, resp){
        if (req.action === undefined)
            return false;

        try{
            switch (req.action){
                case IPCRequestAction.GetProperty:
                case IPCRequestAction.GetPropertyAsBool:
                case IPCRequestAction.GetPropertyAsInteger:{
                    const value = localStorage[req.prop];
                    let result;

                    switch (req.action){
                        case IPCRequestAction.GetProperty:
                            result = value;
                            break;

                        case IPCRequestAction.GetPropertyAsBool:
                            result = value === 'true';
                            break;

                        case IPCRequestAction.GetPropertyAsInteger:
                            result = parseInt(value);
                            break;
                    }

                    resp(PostIpcProcedure(true, { value: result }));
                }break;

                case IPCRequestAction.SetProperty:{
                    localStorage[req.prop] = req.value;

                    resp(PostIpcProcedure(true, {}));
                }break;

                case IPCRequestAction.IsRegexMatch:{
                    const result = matchRegex(req.pattern, req.str);

                    resp(PostIpcProcedure(true, { any: result }));
                }break;

                case IPCRequestAction.GetRegexMatches:{
                    const result = execRegex(req.pattern, req.str);

                    if(result === false || result === undefined || result === null){
                        resp(PostIpcProcedure(false, {}));
                        break;
                    }

                    resp(PostIpcProcedure(true, { any: result.length !== 0, ranges: result }));
                }
            }

            return true;
        }
        catch (e){
            bgapp.debug.logError(`Unable to handle IPC request: ${req.action}. Error message: ${e}`);
            resp(PostIpcProcedure(false, {}));
            return false;
        }
    };

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        // declare EXPERIMENT_FEATURE_IPC_PROC in request object and set it true
        // or nonzero value to use newer procedure to process request
        if(request.EXPERIMENT_FEATURE_IPC_PROC){
            bgapp.debug.log("Use newer IPC controller to handle request...");
            ExperimentIPCProcedure(request, sender, sendResponse);
            return true;
        }

        if(request.action !== "verbose")
            bgapp.debug.verbose(() => `Receive internal process command: ${request.action}`)

        switch (request.action) {
            case "saveDomain": {
                bgapp.mainStorage.put(request.data)
                    //.then(syncAllInstances)
                    .then(_ => sendResponse(true))
                    .catch(e => {
                        simpleError(e);
                        sendResponse(false);
                    });
                bgapp.ruleDomains[request.data.id] = request.data;
            }break;

            case "saveDomains": {
                let promises = [];
                for(const data of request.domains)
                {
                    promises.push(bgapp.mainStorage.put(data));
                }

                Promise.all(promises)
                    .then(_ => sendResponse(true))
                    //.then(syncAllInstances)
                    .catch(e => {
                        simpleError(e);
                        sendResponse(false);
                    });
            }break;

            case "getDomains": {
                bgapp.mainStorage.getAll().then(function (domains) {
                    sendResponse(domains || []);
                }).catch(simpleError);
            }break;

            case "deleteDomain": {
                bgapp.mainStorage.delete(request.id)
                    //.then(syncAllInstances)
                    .then(function (_){
                        // Send empty response to avoid Unchecked runtime error.
                        sendResponse('');
                    })
                    .catch(simpleError);
                delete bgapp.ruleDomains[request.id];
            }break;

            case "import": {
                let maxId = 0;
                for (const id in bgapp.ruleDomains) {
                    maxId = Math.max(maxId, parseInt(id.substring(1)));
                }
                maxId++;
                Promise.all(request.data.map(function (domainData) {
                    // don't overwrite any pre-existing domains.
                    domainData.id = "d" + maxId++;
                    bgapp.ruleDomains[domainData.id] = domainData;
                    return bgapp.mainStorage.put(domainData);
                }))
                    //.then(syncAllInstances)
                    .catch(simpleError);
            }break;

            case "makeGetRequest": {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", request.url, true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        sendResponse(xhr.responseText);
                    }
                };
                xhr.send();
            }break;

            case "setSetting": {
                localStorage[request.setting] = request.value;
                sendResponse();
            }break;

            case "getSetting": {
                sendResponse(localStorage[request.setting]);
            }break;

            case "getBoolSetting": {
                sendResponse(localStorage[request.setting] === 'true');
            }break;

            case "syncMe": {
                bgapp.syncFunctions.push(sendResponse);
            }break;

            case "match": {
                // standard pattern match
                if(!request.useRegex){
                    sendResponse(match(request.domainUrl, request.windowUrl).matched);
                }
                // regex pattern match
                else{
                    sendResponse(matchRegex(request.domainUrl, request.windowUrl));
                }
            }break;

            // Get regular expression match results (start index and end index array)
            case "regexGetRange": {
                const result = execRegex(request.pattern, request.string);
                if (!result){
                    sendResponse({result: null, isSuccess: false});
                }
                else{
                    sendResponse({result: result, isSuccess: true});
                }
            }break;

            case "extractMimeType":
                sendResponse(bgapp.extractMimeType(request.fileName, request.file));
                break;

            case "verbose":{
                bgapp.debug.verbose(request.arguments);
                sendResponse(true);
            }break;
        }

        // !!!Important!!! Need to return true for sendResponse to work.
        return true;
    });

    chrome.webRequest.onBeforeRequest.addListener(function(details) {
        // Do nothing if no tab source and no initiator. Might need a global ruleset in the future.
        // TODO: Global ruleset
        if(details.tabId < 0 && details.initiator === undefined)
            return {};

        return bgapp.handleRequestV2(details.tabId, details.initiator, details);
    }, { urls: ["<all_urls>"] }, ["blocking"]);

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
    bgapp.mainStorage.getAll()
        .then(function(domains) {
            if(!domains)
                return;

            let loadedDomainsCount = 0;

            domains.forEach(function(domainObj) {
                bgapp.ruleDomains[domainObj.id] = domainObj;
                loadedDomainsCount++;
            });

            bgapp.debug.log(`Loaded and cached ${loadedDomainsCount} domain ruleset.`);
        })
        .catch(function (e){
            bgapp.debug.logError("Unable to access extension storage.");
            simpleError(e);
        })
        .finally(function (){
            bgapp.debug.log("Background is initialized.");
        });
}
