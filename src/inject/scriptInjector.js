(function() {
    "use strict";

    // Minimized procedure of extract regex string
    function extractRegexStringProcedure(regexPattern) {
        let a = -1;let b = -1;if (regexPattern.startsWith("/")) a = 1;for (let i = regexPattern.length - 1; i >= 0; i--) {if (regexPattern[i] === '/') {b = i;break;}}
        if (a === -1 || b === -1 || a === b) {const msg = `Regular expression pattern ${regexPattern} is invalid. `+"Start and end slash is needed.";return {isSuccess: false, message: msg};}
        let c = regexPattern.slice(a, b);let d = "";if (b + 1 < regexPattern.length) d = regexPattern.slice(b + 1);return {isSuccess: true, pattern: c, flags: d};
    }
    function matchRegex(fullPattern, str){
        const extractResult=extractRegexStringProcedure(fullPattern);if(!extractResult.isSuccess){console.error(extractResult.message);return false;}
        let {pattern, flags}=extractResult;let r=new RegExp(pattern, flags);return r.test(str);
    }
    function execRegexCore(fullPattern, str){
        const extractResult = extractRegexStringProcedure(fullPattern);if(!extractResult.isSuccess)
        {console.error(extractResult.message);return false;}let {pattern, flags} = extractResult;
        let regex = new RegExp(pattern, flags);let result = [];let match;
        while (match = regex.exec(str)){result.push({a: match.index, b: match.index + match.length, l: match.length})}
        return result;
    }
    function execRegex(fullPattern, str){
        const result = execRegexCore(fullPattern,str);
        return {result: result, isSuccess: !(!result)};
    }

    function IsMatch(a,b,useRegex){
        switch (useRegex){
            case true: if(!matchRegex(a, b)) return false; break;
            default: if(a !== b) return false; break;
        }
        return true;
    }

    const verbose = function (arg){
        chrome.runtime.sendMessage({action: "verbose", arguments: arg}, _ => {});
    }
	
	chrome.runtime.onMessage.addListener(function(msg) {
        if (msg.action === 'log') {
            let logStyle = "color: #007182; font-weight: bold;";
            if (msg.important) {
                logStyle += "background: #AAFFFF;";
            }
            console.log("%c[Resource Override] " + msg.message, logStyle);
        }
    });

    let detector = 0;
    let ruleActions = [];

    // Preload procedure should be synchronous. Don't use asynchronous apis here otherwise you'll be headache(((( F
    const onPerformPreloadRuleAction = function (node, wrap){
        switch (wrap.mode){
            // HTML Attribute replace mode (preload)
            case 1:
            {
                const rule = wrap.rule;
                if(node.tagName === undefined) return;

                const tag = node.tagName;

                if(tag !== rule.tagName) return;

                if(!IsMatch(rule.match, node[rule.attribName], rule.isMatchRegex)) return;

                verbose(`Replacing attribute ${rule.attribName} ${node.src} to ${rule.replace}...`);
                node[rule.attribName] = rule.replace;
            }
            break;

            // Replace JavaScript inline fragment mode
            case 2:{
                const rule = wrap.rule;

                if(node.tagName === undefined)
                    return;

                if(node.tagName !== "SCRIPT")
                    return;

                if(node.innerText === undefined)
                    return;

                if(node.innerText.length === 0)
                    return;

                switch (rule.isMatchRegex){
                    // Use regular expression to match inline fragments and replace them by replace string from rule.
                    //
                    case true:{
                        const response = execRegex (rule.match, node.innerText)

                        if(!response.isSuccess)
                            return;

                        let modify = node.innerText;
                        let offset = 0;

                        // a means start index, b are end index, and l is length of match range result
                        for(const {a, b, l} of response.result){
                            // Replace string length
                            const rl = rule.replace.length;

                            modify = modify.slice(0, a - offset) + rule.replace + modify.slice(b - offset);

                            // if replace string length not match fragment length, then add some offset
                            // to correct further replace positions.
                            if(rl !== l){
                                const delta = l - rl;
                                offset += delta;
                            }
                        }

                        node.innerText = modify;
                    }break;

                    // simple text match
                    case false:{
                        // not ready, yet.
                        // TODO: Implement simple fragment match feature
                        console.warn("Simple fragment match and replace feature not ready!");
                    }break;
                }
            }
        }
    }

    const processDomain = function(domain) {
        const rules = domain.rules || [];
        rules.forEach(function(rule) {
            if (!rule.on)
                return;

            switch (rule.type){

                // Replace JavaScript inline fragment mode
                case "replaceFragmentInlineJs": ruleActions.push({mode: 2, rule: rule}); break;
                case "htmlAttribOverrideOnAppend": ruleActions.push({mode: 1, rule: rule}); break;

                case "injectFile": {

                    // TODO: HEAD and BODY mode
                    verbose(`Inject a DOM to HEAD...`);
                    const dom = document.createElement(rule.tagName);
                    dom[rule.attribName] = rule.value;

                    for(const pair of rule.attribs)
                        dom[pair.key] = pair.value;

                    document.head.appendChild(dom);
                }break;

                case "injectInline": {
                    verbose(`Inject a DOM to HEAD...`);
                    // TODO: HEAD and BODY mode
                    document.head.insertAdjacentHTML(rule.position, rule.inlineHtml);
                }
            }
        });
    };

    console.log ("injection is instantiated.");

    chrome.runtime.sendMessage({action: "getDomains"}, function(domains) {
        domains = domains || [];
        domains.forEach(function(domain) {
            if (domain.on && IsMatch(domain.matchUrl, location.href, domain.isMatchRegex)) {
                processDomain(domain);
                if(detector === 0){
                    console.log(() => `Initialize MutationObserver`);
                    // Used for detect element while they appended and during preload
                    // We could use it as interception of elements.
                    detector = new MutationObserver(function (mutations){
                        for (const m of mutations)
                            for (const n of m.addedNodes)
                                for (const rule of ruleActions)
                                    onPerformPreloadRuleAction(n, rule);
                    })
                    detector.observe(document, {childList: true, subtree: true});
                }
            }
        });
    });
})();
