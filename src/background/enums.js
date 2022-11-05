const IPCRequestAction = {

    // Get value from extension storage.
    // @properties prop: string
    // @returns value: string
    GetProperty: 1,

    // Get value from extension storage and convert it as boolean value.
    // @properties prop: string
    // @returns value: bool
    GetPropertyAsBool: 2,

    // Get value from extension storage and convert it as numeric value (int).
    // @properties prop: string
    // @returns value: int
    GetPropertyAsInteger: 3,

    // Set value to extension storage.
    // @properties prop: string, value: any
    // @returns none
    SetProperty: 4,



    // Run regular expression to validate any match string. Parameter "pattern" is regex pattern mix with flags.
    // @properties pattern: string, str: string
    // @returns any: boolean
    IsRegexMatch: 10,

    // Run regular expression to find all matched ranges of string. Parameter "pattern" is regex pattern mix with flags.
    // @properties pattern: string, str: string
    // @returns any: boolean, ranges: array { a: int (start index), b: int (end index), l: int (range length) }
    GetRegexMatches: 11,

    // Find any match ruleset
    // @properties pattern: string, url: string
    // @returns any: boolean, domains: array { domain }
    AnyRulesetMatch: 15,
};

const RuleAction = {
    Unknown: 0,
    RequestUrlToUrl: 1,
    RequestUrlToFile: 2,
    InjectElement: 10,
    InjectFile: 11,
    Header: 20,
    InlineResourceReplace: 30,
    ReplaceHtmlAttributeOnAppend: 40
}

/// Convert old rule.type string to newer RuleAction enum
const RuleTypeStringToRuleAction = function (s) {
    switch (s){
        case "normalOverride": return RuleAction.RequestUrlToUrl;
        case "fileOverride": return RuleAction.RequestUrlToFile;
        case "fileInject": return RuleAction.InjectFile;
        case "headerRule": return RuleAction.Header;
        default: return RuleAction.Unknown;
    }
}
