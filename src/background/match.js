function tokenize(str) {
    "use strict";
    var ans = str.split(/(\*+)/g);
    if (ans[0] === "") {
        ans.shift();
    }
    if (ans[ans.length - 1] === "") {
        ans.pop();
    }
    return ans;
}

function match(pattern, str) {
    "use strict";
    var patternTokens = tokenize(pattern);
    var freeVars = {};
    var varGroup;
    var strParts = str;
    var matchAnything = false;
    var completeMatch = patternTokens.every(function(token) {
        if (token.charAt(0) === "*") {
            matchAnything = true;
            varGroup = token.length;
            freeVars[varGroup] = freeVars[varGroup] || [];
        } else {
            var matches = strParts.split(token);
            if (matches.length > 1) {
                // The token was found in the string.
                var possibleFreeVar = matches.shift();
                if (matchAnything) {
                    // Found a possible candidate for the *.
                    freeVars[varGroup].push(possibleFreeVar);
                } else {
                    if (possibleFreeVar !== "") {
                        // But if we haven't seen a * for this freeVar,
                        // the string doesnt match the pattern.
                        return false;
                    }
                }

                matchAnything = false;
                // We matched up part of the pattern to the string
                // prepare to look at the next part of the string.
                strParts = matches.join(token);
            } else {
                // The token wasn't found in the string. Pattern doesn't match.
                return false;
            }
        }
        return true;
    });

    if (matchAnything) {
        // If we still need to match a string part up to a star,
        // match the rest of the string.
        freeVars[varGroup].push(strParts);
    } else {
        if (strParts !== "") {
            // There is still some string part that didn't match up to the pattern.
            completeMatch = false;
        }
    }

    return {
        matched: completeMatch,
        freeVars: freeVars
    };
}

function replaceAfter(str, idx, match, replace) {
    "use strict";
    return str.substring(0, idx) + str.substring(idx).replace(match, replace);
}

function matchReplace(pattern, replacePattern, str) {
    "use strict";
    var matchData;
    if (pattern.matched !== undefined && pattern.freeVars !== undefined) {
        // accept match objects.
        matchData = pattern;
    } else {
        matchData = match(pattern, str);
    }

    if (!matchData.matched) {
        // If the pattern didn't match.
        return str;
    }

    // Plug in the freevars in place of the stars.
    var starGroups = replacePattern.match(/\*+/g) || [];
    var currentStarGroupIdx = 0;
    var freeVar;
    var freeVarGroup;
    starGroups.forEach(function(starGroup) {
        freeVarGroup = matchData.freeVars[starGroup.length] || [];
        freeVar = freeVarGroup.shift();
        freeVar = freeVar === undefined ? starGroup : freeVar;
        replacePattern = replaceAfter(replacePattern, currentStarGroupIdx, starGroup, freeVar);
        currentStarGroupIdx = replacePattern.indexOf(freeVar) + freeVar.length;
    });

    return replacePattern;
}

// This procedure used for extract regex pattern and flags
// It won't return "null" or "undefined" or any similar null values
// but, instead it always returns "isSuccess" property to know the procedure is completed or not.
function extractRegexStringProcedure(regexPattern) {
    let firstSlashIndex = -1;
    let lastSlashIndex = -1;

    // Find start slash and store index if found
    if (regexPattern.startsWith("/"))
        firstSlashIndex = 1;

    // Find last slash from end and store index if found
    for (let i = regexPattern.length - 1; i >= 0; i--) {
        if (regexPattern[i] === '/') {
            lastSlashIndex = i;
            break;
        }
    }

    // if no start slash and (or) last slash index, then log to console and return false.
    if (firstSlashIndex === -1 || lastSlashIndex === -1 || firstSlashIndex === lastSlashIndex) {
        const msg = `Regular expression pattern ${regexPattern} is invalid. `
            + "Start and end slash is needed.";
        return {isSuccess: false, message: msg};
    }

    // get pattern and flags by slicing full pattern
    let pattern = regexPattern.slice(firstSlashIndex, lastSlashIndex);
    let flags = "";
    if (lastSlashIndex + 1 < regexPattern.length)
        flags = regexPattern.slice(lastSlashIndex + 1);

    return {isSuccess: true, pattern, flags};
}

function matchRegex(fullPattern, str){
    const extractResult = extractRegexStringProcedure(fullPattern);

    if(!extractResult.isSuccess)
    {
        bgapp.debug.logError(extractResult.message);
        return false;
    }

    let {pattern, flags} = extractResult;

    // create regular expression instance
    let regex = new RegExp(pattern, flags);

    // compare url by regex and return result
    let result = regex.test(str);
    bgapp.debug.verbose(() => `Compare ${str} with regex "${pattern}", flags "${flags}", result: ${result}`);
    return result;
}

function execRegex(fullPattern, str){
    const extractResult = extractRegexStringProcedure(fullPattern);

    if(!extractResult.isSuccess)
    {
        bgapp.debug.logError(extractResult.message);
        return false;
    }

    let {pattern, flags} = extractResult;

    // create regular expression instance
    let regex = new RegExp(pattern, flags);

    let result = [];

    // execute regex test and get match ranges (start index and end index array)
    let match;
    while (match = regex.exec(str)){
        result.push({
            a: match.index,
            b: match.index + match.length,
            l: match.length
        })
    }

    bgapp.debug.verbose(() => `Found ${result.length} results. Regex pattern: "${pattern}", flags "${flags}"`);
    return result;
}

if (typeof module === "object" && module.exports) {
    module.exports = matchReplace;
}
