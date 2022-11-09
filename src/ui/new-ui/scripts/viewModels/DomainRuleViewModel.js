// main rule view model
function DomainRuleViewModel(rule, onChangedHandler){
    const self = this;
    const onChangedHandlerParent = onChangedHandler;

    self.model = rule;

    self.isRuleEnabled = ko.observable(rule.on);
    self.ruleKind = GetRuleDisplayName(rule.type);
    self.kind = rule.type;

    function onChanged (_){
        onChangedHandlerParent(_);
    }

    self.isRuleEnabled.subscribe(onChanged);

    switch (rule.type){
        case "normalOverride":
        {
            self.isMatchRegex = ko.observable(rule.isMatchRegex);
            self.match = ko.observable(rule.match);
            self.replace = ko.observable(rule.replace);

            self.isMatchRegex.subscribe(onChanged);
            self.match.subscribe(onChanged);
            self.replace.subscribe(onChanged);

            self.applyChanges = function (){
                self.model.isMatchRegex = self.isMatchRegex();
                self.model.match = self.match();
                self.model.replace = self.replace();
            }
        }break;

        case "htmlAttribOverrideOnAppend":{
            // Override attribute value if node are in HTML.Head element?
            // true if it is, otherwise it will be in HTML.Body
            self.inHeadSection = ko.observable(rule.inHeadSection);
            self.tagName = ko.observable(rule.tagName);
            self.attribName = ko.observable(rule.attribName);
            self.replace = ko.observable(rule.replace);
            self.isMatchRegex = ko.observable(rule.isMatchRegex);
            self.match = ko.observable(rule.match);

            self.inHeadSection.subscribe(onChanged);
            self.tagName.subscribe(onChanged);
            self.attribName.subscribe(onChanged);
            self.replace.subscribe(onChanged);
            self.isMatchRegex.subscribe(onChanged);
            self.match.subscribe(onChanged);

            self.applyChanges = function (){
                self.model.inHeadSection = self.inHeadSection();
                self.model.tagName = self.tagName();
                self.model.attribName = self.attribName();
                self.model.isMatchRegex = self.isMatchRegex();
                self.model.match = self.match();
                self.model.replace = self.replace();
            }
        }break;

        // Inject File by URL
        case "injectFile":{
            let attribs = rule.attribs;

            if(attribs === undefined)
                attribs = [];

            const attribsVmList = [];
            for (const attrib of attribs)
                attribsVmList.push(new KeyValuePairViewModel(attrib, onChangedHandler));

            self.inHeadSection = ko.observable(rule.inHeadSection);
            self.tagName = ko.observable(rule.tagName);
            self.attribName = ko.observable(rule.attribName);
            self.value = ko.observable(rule.value);
            self.attribs = ko.observableArray(attribsVmList);

            self.inHeadSection.subscribe(onChanged);
            self.tagName.subscribe(onChanged);
            self.attribName.subscribe(onChanged);
            self.value.subscribe(onChanged);
            self.attribs.subscribe(onChanged);

            self.applyChanges = function (){
                self.model.inHeadSection = self.inHeadSection();
                self.model.tagName = self.tagName();
                self.model.attribName = self.attribName();
                self.model.value = self.value();

                const attribs = [];
                for (const attribVm of self.attribs()){
                    attribVm.applyChanges();
                    attribs.push(attribVm.model);
                }

                self.model.attribs = attribs;
            }

            self.addKeyValuePair = function (){
                self.attribs.push(new KeyValuePairViewModel({key: "", value: ""}, onChanged));
            }
        }break;

        case "injectInline":{
            self.inHeadSection = ko.observable(rule.inHeadSection);
            self.position = ko.observable(rule.position);
            self.inlineHtml = ko.observable(rule.inlineHtml);
            // Store expand state
            self.isExpanded = ko.observable(false);

            // Expand switch button event
            self.switchExpandedCommand = function (_){
                self.isExpanded(!self.isExpanded());
            }

            self.inHeadSection.subscribe(onChanged);
            self.position.subscribe(onChanged);
            self.inlineHtml.subscribe(onChanged);

            self.applyChanges = function (){
                self.model.inHeadSection = self.inHeadSection();
                self.model.position = self.position();
                self.model.inlineHtml = self.inlineHtml();
            }
        }break;

        default:
        {
            self.applyChanges = function (){
            }
        }break;
    }
}
