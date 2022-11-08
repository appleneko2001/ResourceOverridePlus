function IPCRequestTask(action, params, onSuccess){
    params.EXPERIMENT_FEATURE_IPC_PROC = true;
    params.action = action;

    if(onSuccess === undefined)
        onSuccess = function (_) {};

    chrome.runtime.sendMessage(params, onSuccess);
}

function IPCRequestPromise(action, params, onSuccess){
    return new Promise((resolve, reject) =>{
        try{
            IPCRequestTask(action, params, (answer) => {
                if(onSuccess === undefined)
                    onSuccess = function (_) {};

                onSuccess(answer);
                resolve(answer);
            });
        }
        catch (e) {
            reject(e);
        }
    });
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
