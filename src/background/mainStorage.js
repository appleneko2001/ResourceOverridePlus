/* global bgapp, keyvalDB */
{
    // Old database storage implementation, which might not work in my ungoogled chromium
    function DatabaseStorage() {
        const db = keyvalDB("OverrideDB", [{store: "domains", key: "id"}], 1);
        const domainStore = db.usingStore("domains");

        const put = function (domainData) {
            return new Promise(function (res, rej) {
                db.open(function (err) {
                    if (err) {
                        console.error(err);
                        rej(err);
                    } else {
                        domainStore.upsert(domainData.id, domainData, function (err) {
                            if (err) {
                                console.error(err);
                                rej(err);
                            } else {
                                res();
                            }
                        });
                    }
                });
            });
        };

        const getDomains = function () {
            return new Promise(function (res, rej) {
                db.open(function (err) {
                    if (err) {
                        console.error(err);
                        rej(err);
                    } else {
                        domainStore.getAll(function (err, ans) {
                            if (err) {
                                console.error(err);
                                rej(err);
                            } else {
                                res(ans);
                            }
                        });
                    }
                });
            });
        };

        const deleteDomain = function (id) {
            return new Promise(function (res, rej) {
                db.open(function (err) {
                    if (err) {
                        console.error(err);
                        rej(err);
                    } else {
                        domainStore.delete(id, function (err) {
                            if (err) {
                                console.error(err);
                                rej(err);
                            } else {
                                res();
                            }
                        });
                    }
                });
            });
        };

        return {
            put: put,
            getAll: getDomains,
            delete: deleteDomain
        };
    }

    function ChromiumStorage(){
        const rulesKey = "rules";

        const setRulesetInternal = function (rules, resolve){
            bgapp.debug.verbose(`syncing changes to storage...`)
            chrome.storage.sync.set({rules}, resolve);
        }

        const onFailInternal = function (actionName, reason, reject){
            bgapp.debug.logError(`Failed to ${actionName}: ${reason}`);
            reject(reason);
        }

        const getDomainsInternal = function (resolve, reject){
            chrome.storage.sync.get(rulesKey, function (result){
                let lastError = chrome.runtime.lastError;

                if(lastError){
                    onFailInternal("retrieve ruleset", lastError, reject);
                    return;
                }

                let arr = [];

                // if result is not null or empty object

                if(result !== {}){
                    bgapp.debug.verbose(`result is ${result}, accessing object...`)
                    arr = result.rules;
                }

                resolve(arr)
            });
        }

        const put = function (domainData){
            return new Promise(function (resolve, reject){
                getDomainsInternal(function (rules){
                    let isReplaced = rules.ifCondition(o => o.id === domainData.id, i => {
                        bgapp.debug.verbose(`replacing rule at index ${i}... (${rules[i].id})`);
                        rules.splice(i, 1, domainData);
                    });

                    if(!isReplaced){
                        bgapp.debug.verbose(`adding rule ${domainData.id} to ruleset`)
                        rules.push(domainData);
                    }

                    setRulesetInternal(rules, resolve);
                }, reason => {
                    onFailInternal ("add rule to ruleset", reason, reject)
                })
            });
        }

        const getDomains = function (){
            return new Promise(getDomainsInternal);
        }

        const deleteDomain = function (id) {
            return new Promise(function (resolve, reject) {
                getDomainsInternal(function (rules){
                    if(rules.ifCondition(o => o.id === id, i => {
                        bgapp.debug.verbose(`deleting rule at index ${i}... (${rules[i].id})`)
                        rules.splice(i, 1)
                    })){
                        setRulesetInternal(rules, resolve);
                    }
                }, reason => {
                    onFailInternal ("delete rule to ruleset", reason, reject)
                })
            });
        };

        return {
            put: put,
            getAll: getDomains,
            delete: deleteDomain
        };
    }

    const useChromeStorage = true;

    let storageKind = "";

    switch (useChromeStorage){
        case true:
            storageKind = "chromium storage API";
            bgapp.mainStorage = (ChromiumStorage)();
            break;

        case false:
            storageKind = "IndexedDB API";
            bgapp.mainStorage = (DatabaseStorage)();
            break;
    }

    bgapp.debug.log(`Use ${storageKind} as storage management API.`);
}
