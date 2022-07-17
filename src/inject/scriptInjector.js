(function() {
    "use strict";

    const fileTypeToTag = {
        js: "script",
        css: "style"
    };

    const verbose = function (arg){
        chrome.runtime.sendMessage({action: "verbose", arguments: arg}, () => {});
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

    // rule.match, rule.replace

    const onAddNodeToDocument = function (node, rule){
        if(node.tagName === 'undefined')
            return;

        if(node.tagName !== "SCRIPT")
            return;

        verbose(() => `[ResourceOverridePlus] Detected add node to document: ${node}`);

        if (node.src !== rule.match)
            return;

        console.log(`[ResourceOverridePlus] Replacing source ${node.src} to ${rule.replace}...`)
        node.src = rule.replace;
    }

    const processDomain = function(domain) {
        const rules = domain.rules || [];
        rules.forEach(function(rule) {
            if (!rule.on)
                return;

            switch (rule.type){
                case "normalOverride":
                    const detector = new MutationObserver(function (mutations){
                        for (const m of mutations)
                            for (const n of m.addedNodes)
                                onAddNodeToDocument(n, rule);
                    })
                    detector.observe(document, {childList: true, subtree: true});
                    break;

                case "fileInject":
                    const newEl = document.createElement(fileTypeToTag[rule.fileType] || "script");
                    newEl.appendChild(document.createTextNode(rule.file));
                    if (rule.injectLocation === "head") {
                        const firstEl = document.head.children[0];
                        if (firstEl) {
                            document.head.insertBefore(newEl, firstEl);
                        } else {
                            document.head.appendChild(newEl);
                        }
                    } else {
                        if (document.body) {
                            document.body.appendChild(newEl);
                        } else {
                            document.addEventListener("DOMContentLoaded", function() {
                                document.body.appendChild(newEl);
                            });
                        }
                    }
                    break;
            }
        });
    };

    chrome.runtime.sendMessage({action: "getDomains"}, function(domains) {
        domains = domains || [];
        domains.forEach(function(domain) {
            if (domain.on) {
                chrome.runtime.sendMessage({
                    action: "match",
                    useRegex: domain.isMatchRegex,
                    domainUrl: domain.matchUrl,
                    windowUrl: location.href
                }, function(result) {
                    if (result) {
                        processDomain(domain);
                    }
                });
            }
        });
    });


	
	
})();
