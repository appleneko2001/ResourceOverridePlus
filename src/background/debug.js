{
    function DebuggerClass (){
        const LEVEL_INFO = 0;
        const LEVEL_WARN = 1;
        const LEVEL_ERROR = 2;

        let verboseEnabled = false;

        const logInternal = function (msg, level){
            const message = `[ResourceOverridePlus] ${msg}`;

            switch (level){
                case LEVEL_INFO:
                    console.log(message);
                    break;

                case LEVEL_WARN:
                    console.warn(message);
                    break;

                case LEVEL_ERROR:
                    console.error(message);
                    break;
            }
        }

        const log = function (msg){
            logInternal (msg, LEVEL_INFO);
        }

        const logWarn = function (msg){
            logInternal (msg, LEVEL_WARN);
        }

        const logError = function (msg){
            logInternal (msg, LEVEL_ERROR);
        }

        const verbose = function (msg){
            if (msg === undefined)
                return;

            if(verboseEnabled)
            {
                let typ = typeof msg;

                if (typ === "string"){
                    logInternal (msg, LEVEL_INFO);
                    return;
                }

                logInternal (msg(), LEVEL_INFO);
            }
        }

        const enableVerbose = function (v){
            switch (v){
                case true:
                    verboseEnabled = true;
                    break;

                case false:
                    verboseEnabled = false;
                    break;

                default:
                    logError("Invalid argument! Available arguments: true, false");
                    return;
            }

            log("Verbose output is " + (verboseEnabled ? "enabled" : "disabled"));
        }

        return {
            /// Switch verbose message invoke. Argument: boolean value
            enableVerbose: enableVerbose,

            /// Output verbose message to console if possible. Argument: function to string
            verbose: verbose,
            log: log,
            logWarn: logWarn,
            logError: logError
        };
    }

    bgapp.debug = (DebuggerClass)();

    /// Switch verbose message invoke. Argument: boolean value
    bgapp.enableVerbose = bgapp.debug.enableVerbose;
}
