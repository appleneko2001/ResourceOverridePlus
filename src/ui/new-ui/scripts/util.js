function IPCRequestTask(action, params, onSuccess){
    params.EXPERIMENT_FEATURE_IPC_PROC = true;
    params.action = action;

    if(onSuccess === undefined)
        onSuccess = function (_) {};

    chrome.runtime.sendMessage(params, onSuccess);
}

function RequestBackgroundTask(action, params, onSuccess){
    params.action = action;
    chrome.runtime.sendMessage(params, onSuccess);
}

function GetFirstElementWhere(arr, pred){
    for (const e of arr){
        if(pred(e))
            return e;
    }

    return undefined;
}
