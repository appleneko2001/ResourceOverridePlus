// Frontend script for options page

const languages = [
    {
        name: "English",
        id: "en"
    }, {
        name: "中文",
        id: "zh"
    }
];

const themePalettes = [
    {
        name: "Light",
        id: "light",
        codemirror: 'base16-light',
    },{
        name: "Night",
        id: "dark",
        codemirror: 'material-ocean',
    },{
        name: "Black (Amoled-friendly)",
        id: "amoled-dark",
        codemirror: 'nord-black',
    }
];

const templatesImportList = [
    "prefer-language",
    "part-templates-import",
    "rules-templates-import",
    "domain-templates-import"
];

const insertHtmlPositionList = [
    // InsertHtmlPosition Explains: https://medium.com/@urgen.nyc/innerhtml-vs-insertadjacenthtml-afec74570afc
    {
        id: InsertHtmlPosition.AfterBegin,
        name: "First"
    },
    {
        id: InsertHtmlPosition.BeforeEnd,
        name: "Push"
    },
];

const supportedRulesList = [
    {
        id: "normalOverride",
        name: "WebRequest URL to URL",
        templateKey: "domain-rule-content-normal-override-template"
    },
    {
        id: "htmlAttribOverrideOnAppend",
        name: "HTML Element attribute replace (preload)",
        templateKey: "domain-rule-content-html-attrib-override-preload-template"
    },
    {
        id: "injectFile",
        name: "Inject File by URL (obsolete, use Inject HTML DOM inline instead).",
        templateKey: "inject-file-url-template"
    },
    {
        id: "injectInline",
        name: "Inject HTML DOM inline",
        templateKey: "inject-dom-inline-template"
    }
];

const tabsCollection = [
    {
        tab: "home",
        text: "tabs.home",
        icon: "icons-home"
    }, {
        tab: "domains",
        text: "tabs.domains",
        icon: "icons-rule-folder"
    }, {
        tab: "settings",
        text: "tabs.settings",
        icon: "icons-tune"
    }, {
        tab: "help",
        text: "tabs.help",
        icon: "icons-help"
    }
];

function IsEntryExist(e){
    for (const tab of tabsCollection){
        if(tab.tab === e)
            return true;
    }

    return false;
}

function IsNarrowSight (p){
    const w = innerWidth;
    const h = innerHeight;
    if(w === null || w === undefined || isNaN(w))
        return false;

    if(h === null || h === undefined || isNaN(h))
        return false;

    return w <= 900 || w / h < 0.72 || p;
}

function OpenJsonFileDialog(resolver, onSuccess, onFail){
    function OnOpenFileInputChanged (e){
        const file = e.target.files[0];

        const reader = new FileReader();
        reader.onloadend = function (){
            const json = reader.result;
            const handler = function (resolve, reject){
                try{
                    resolver(json);
                    resolve();
                }
                catch (error){
                    reject(error);
                }
            };
            new Promise(handler)
                .then(onSuccess)
                .catch(onFail);
        }
        reader.readAsText(file);
    }

    const openFileInput = document.createElement("input");
    openFileInput.onchange = OnOpenFileInputChanged;
    openFileInput.type = "file";
    openFileInput.accept = ".json";
    openFileInput.click();
    openFileInput.remove();
}

// In this frontend script used KnockoutJS library to power MVVM system
let languageSetter = document.head.querySelector("link#prefer-language");
let themeColourPalette = document.head.querySelector("link#theme-colour-palette");
let codemirrorThemeSetter = document.head.querySelector("link#codemirror-theme");
let tabContentContainer = document.body.querySelector("#ui-tab-content");

// noinspection JSPotentiallyInvalidConstructorUsage
ko.bindingProvider.instance = new ko.secureBindingsProvider({
    attribute: "data-bind",
    globals: window,
    bindings: ko.bindingHandlers,
    noVirtualElements: false
});

/*
ko.bindingHandlers.fadeToastVisible = {
    update: function (element, valueAccessor){
        var shouldDisplay = valueAccessor();
        shouldDisplay ? element.
    }
}*/

function CreateDomainRulesetDummy(id){
    return {
        id: id,
        isMatchRegex: false,
        matchUrl: "",
        on: true,
        rules: []
    };
}

function GetRuleTemplateName(type){
    const searchResult = GetFirstElementWhere(supportedRulesList, a => a.id === type);

    if(!(searchResult === undefined)){
        return searchResult.templateKey;
    }

    return "domain-rule-content-unknown-template";
}

function GetRuleDisplayName(type){
    const searchResult = GetFirstElementWhere(supportedRulesList, a => a.id === type);

    if(!(searchResult === undefined ||searchResult === null)){
        return searchResult.name;
    }

    return "Unknown rule kind or not supported yet.";
}

function ChangeThemeColourPalette(id){
    const result = themePalettes.find(a => a.id === id);

    if(result === undefined)
        return false;

    if(result.id === undefined)
        return false;

    themeColourPalette.href = `css/colours/${result.id}.css`;
    codemirrorThemeSetter.href = `libraries/codemirror5/theme/${result.codemirror}.css`;
    return true;
}

function ChangeLanguage(locate){
    languageSetter.href = `resources/languages/${locate}.html`;
    return true;
}

function DeletionCommand(){
    const self = this;

    self.isConfirming = ko.observable(false);
    self.isAbleToDelete = ko.observable(true);
    self.hideDeleteButton = ko.observable();

    const onStatusChanged = function (_){
        const result = (self.isConfirming() === false && self.isAbleToDelete());
        self.hideDeleteButton(!result);
    }

    self.requestDelete = function (_){
        self.isConfirming (true);
    }

    self.giveUp = function (_){
        self.isConfirming (false);
    }

    self.performDeletion = function (){

    }

    self.isConfirming.subscribe(onStatusChanged);
    self.isAbleToDelete.subscribe(onStatusChanged);

    onStatusChanged(null);
}

function KeyValuePairViewModel(item, onChangedHandler){
    const self = this;
    const onChangedHandlerParent = onChangedHandler;

    self.model = item;

    function onChanged (_){
        onChangedHandlerParent(_);
    }

    self.key = ko.observable(item.key);
    self.value = ko.observable(item.value);

    self.key.subscribe(onChanged);
    self.value.subscribe(onChanged);

    self.applyChanges = function(){
        self.model.key = self.key();
        self.model.value = self.value();
    }
}

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

// Domain view model
function DomainRulesetViewModel(domain){
    const self = this;

    self.model = domain;

    self.options = {
        on: domain.on,
        name: domain.name === undefined ? domain.id : domain.name,
        isMatchRegex: domain.isMatchRegex,
        matchUrl: domain.matchUrl
    }

    self.name = ko.observable(self.options.name);
    self.isMatchRegex = ko.observable(domain.isMatchRegex);
    self.matchUrl = ko.observable(domain.matchUrl);
    self.isRulesetEnabled = ko.observable(domain.on);
    self.rules = ko.observableArray();
    self.ruleCreationKind = ko.observable();

    // It will be true if view model data has changed but changes still not applied.
    self.isDirty = ko.observable(false);

    // Store expand state
    self.isExpanded = ko.observable(false);

    // Expand switch button event
    self.switchExpandedCommand = function (_){
        self.isExpanded(!self.isExpanded());
    }

    // Replace rules collection from models
    self.applyRules = function (vm, rules){
        vm.rules.removeAll();

        for (const rule of rules){
            vm.pushRule(rule);
        }
    }

    // Replace ruleset options by model
    self.applyOptions = function (vm, domain){
        vm.isMatchRegex(domain.isMatchRegex)
            .name(domain.name)
            .matchUrl(domain.matchUrl)
            .isRulesetEnabled(domain.on);
    }

    // Revert changes by apply old model
    self.revertChangesFromModel = function (){
        self.applyOptions(self, self.options);
        self.applyRules(self, self.model.rules);
    }

    // Replace old model with new data
    self.storeChangesToModel = function (){
        const on = self.isRulesetEnabled();
        const isMatchRegex = self.isMatchRegex();
        const matchUrl = self.matchUrl();

        let rules = [];

        for (const ruleVm of self.rules()){
            ruleVm.applyChanges();
            rules.push(ruleVm.model);
        }

        self.options.on = on;
        self.options.name = self.name();
        self.options.isMatchRegex = isMatchRegex;
        self.options.matchUrl = matchUrl;

        self.model.on = on;
        self.model.name = self.name();
        self.model.isMatchRegex = isMatchRegex;
        self.model.matchUrl = matchUrl;
        self.model.rules = rules;
    }

    self.revertChangesCommand = function (vm){
        vm.revertChangesFromModel();
        vm.isDirty(false);
    }

    // Apply and save changes to disk
    self.saveChangesCommand = function (vm){
        vm.storeChangesToModel();
        self.storeModelToStorage(vm);

        self.isDirty(false);
    }

    self.storeModelToStorage = function (vm)
    {
        const toast = pushToast("Saving...");

        chrome.runtime.sendMessage(
            {
                action: "saveDomain",
                data: vm.model
            },
            function (_){
                try{
                    // Notify user that changes has applied and saved to disk.
                    const text = "Saved changes.";
                    const button = {
                        text: "UNDO",
                        action: function (vm){
                            // TODO: Undo feature
                        }
                    };

                    if(toast.isDismissed){
                        pushToast(text, button);
                    }
                    else{
                        toast.text(text);
                        toast.button(button);
                    }
                }
                catch {
                    // that's fine, user might just close tab after save changes.
                    // but chrome will say as issue. Just ignore it.
                }
                console.info("Saved changes.");
            })
    }

    self.pushRule = function (rule){
        const item = new DomainRuleViewModel(rule, self.onChanged);
        const deletion = new DeletionCommand();
        deletion.performDeletion = function (){
            self.rules.remove(item);
            self.onChanged(null);
        };
        item.deletion = deletion;

        self.rules.push(item);
    }

    self.addNewRule = function (vm){
        const selectedKind = vm.ruleCreationKind();

        const rule = {
            type: selectedKind.id,
            on: true
        };
        self.pushRule(rule);
        self.isDirty(true);
    }

    // Subscribers
    // Prepare handler
    // PS: Might I need to implement automatic saves after any changes rather than save manually?
    self.onChanged = _ => self.isDirty(true);

    // Subscribe changed events
    self.name.subscribe(self.onChanged);
    self.isMatchRegex.subscribe(self.onChanged);
    self.matchUrl.subscribe(self.onChanged);
    self.isRulesetEnabled.subscribe(self.onChanged);

    self.applyRules(self, domain.rules);
}

// Main view model
function ExtensionOptionsViewModel() {
    const self = this;

    // Page is loaded successfully.
    self.isSuccess = true;

    const defaultStartPage = "home";

    self.supportedInsertHtmlPositionList = insertHtmlPositionList;
    self.supportedRules = supportedRulesList;
    self.themes = themePalettes;
    self.selectedTheme = ko.observable();
    self.isPreferNarrowSideBar = ko.observable(false);

    self.toasts = ko.observableArray();

    self.domains = ko.observableArray();
    self.rulesetCreation = ko.observable(null);
    self.isCreatingRuleset = ko.observable(false);

    self.selectedTab = ko.observable();
    self.tabs = tabsCollection;

    self.language = ko.observable("en");
    self.languages = languages;

    self.thirdPartyLibs = [
        {
            name: "KnockoutJS",
            desc: "A lightweight MVVM library without jQuery.",
            url: "https://github.com/knockout/knockout",
            version: ko.version
        },
        {
            name: "KnockoutJS Secure binding",
            desc: "KnockoutJS CSP Compatibility solution (allow KnockoutJS running on modern browser).",
            url: "https://github.com/brianmhunt/knockout-secure-binding"
        },
        {
            name: "CodeMirror 5",
            desc: "A lightweight embedded text editor with syntax highlighting. Supports most markup and programming language, and compatible with old browsers.",
            url: "https://github.com/codemirror/codemirror5",
            version: CodeMirror.version
        },
        {
            name: "Google Material Icons and symbols (rounded)",
            desc: "Some decent vector icons for web-pages, contains filled, outlined and rounded variant.",
            url: "https://github.com/google/material-design-icons"
        }
    ];

    self.isNarrowSight = ko.observable(IsNarrowSight(self.isPreferNarrowSideBar())); // Should be true if main viewport width is less than 800px

    function createDomainRulesetCore(vm, modelCreator) {
        const index = vm.domains().length + 1;
        const id = `d${index}`;

        // create a dummy model
        const model = modelCreator(id);
        const viewModel = new DomainRulesetViewModel(model);

        // Change revert changes button to cancel creation button
        viewModel.revertChangesCommand = function (vm) {
            vm.revertChangesFromModel();
            self.rulesetCreation(null);
        }

        viewModel.saveChangesCommand = function (vm) {
            vm.storeChangesToModel();
            self.rulesetCreation(null);

            const newVm = new DomainRulesetViewModel(viewModel.model);
            newVm.storeModelToStorage(newVm);

            self.appendDomainRuleset(newVm);
        }

        viewModel.isDirty(true);

        vm.rulesetCreation(viewModel);
    }

    self.createDomainRuleset = function (vm) {
        if (self.isCreatingRuleset())
            return;

        createDomainRulesetCore(vm, CreateDomainRulesetDummy);
    }

    self.getRuleTemplateKey = function (ruleVm) {
        return GetRuleTemplateName(ruleVm.kind)
    }

    // KnockoutJS need this option
    self.importV1OptionsCommand = function (_) {
        OpenJsonFileDialog(function (json) {
                // TODO: implementation
                // const model = JSON.parse(json);
            }, () => pushToast("Imported rules."),
            error => pushToast(`Unable to import: ${error}`));
    }

    //
    self.loadOptionsCommand = function (vm) {
        OpenJsonFileDialog(function (json) {
                const model = JSON.parse(json);
                vm.selectedTheme(model.theme);

                let domains = [];
                let increment = 1;
                let lastIndex = 0;

                for (const i in vm.domains()) {
                    if (i < lastIndex)
                        continue;

                    lastIndex = i;
                }

                for (const domain of model.domains) {
                    const index = lastIndex + increment;
                    const id = `d${index}`;
                    increment = increment + 1;

                    domains.push({
                        id: id,
                        on: domain.on,
                        name: domain.name,
                        isMatchRegex: domain.isMatchRegex,
                        matchUrl: domain.matchUrl,
                        rules: domain.rules
                    });
                }

                const msg = {
                    action: "saveDomains",
                    domains: domains
                };

                chrome.runtime.sendMessage(msg, function (_) {
                });
            }, () => pushToast("Settings has loaded."),
            error => pushToast(`Unable to load settings: ${error}`));
    }

    // Method options might usable (vm)
    self.exportOptionsCommand = function (_) {
        chrome.runtime.sendMessage({action: "getDomains"}, function (result) {
            const exportData = {
                version: 2,
                theme: self.selectedTheme(),
                domains: []
            }

            if (result.length) {
                result.forEach(domain => exportData.domains.push(domain));
            }

            const json = JSON.stringify(exportData);
            const blob = new Blob([json], {type: "text/plain"});
            const downloadLink = document.createElement("a");
            downloadLink.download = "ResourceOverrideExportV2.json";
            downloadLink.href = window.URL.createObjectURL(blob);
            downloadLink.click();
            downloadLink.remove();

            pushToast("Please select a location to save file.");
        });
    }

    self.changeTabCommand = tab => self.selectedTab(tab.tab);

    self.appendDomainRuleset = function (ruleset) {
        const deletion = new DeletionCommand();

        deletion.performDeletion = function () {
            chrome.runtime.sendMessage(
                {action: "deleteDomain", id: ruleset.model.id},
                function (_) {
                    self.domains.remove(ruleset);
                    pushToast(`Ruleset "${ruleset.model.name}" has deleted from disk.`, {
                        text: "UNDO",
                        action: function (_) {
                            // TODO: UNDO Feature
                        }
                    });
                });
        }

        ruleset.deletion = deletion;

        self.domains.push(ruleset);
    }

    // Subscribers

    // On document body (main content) resized
    addEventListener("resize", _ => self.isNarrowSight(IsNarrowSight(self.isPreferNarrowSideBar())));

    self.isPreferNarrowSideBar.subscribe(function (a) {
        IPCRequestTask(IPCRequestAction.SetProperty, {prop: "prefer-narrow-side-bar", value: a},
            _ => self.isNarrowSight(IsNarrowSight(self.isPreferNarrowSideBar())));
    });

    self.rulesetCreation.subscribe(v => self.isCreatingRuleset(v != null));

    self.selectedTab.subscribe(function (page) {
        const finalId = `ui-page-${page}`;
        for (const content of tabContentContainer.children) {
            let id = content.id;
            content.classList.toggle("ui-invisible", id !== finalId);
        }

        IPCRequestTask(IPCRequestAction.SetProperty, {prop: "last-tab", value: page}, undefined);
    })

    self.selectedTheme.subscribe(function (v) {
        const result = ChangeThemeColourPalette(v);

        if (!result) {
            self.selectedTheme("dark");
        } else {
            IPCRequestTask(IPCRequestAction.SetProperty, {prop: "theme", value: v}, undefined);
        }
    })

    self.language.subscribe(function (v) {
        if (!ChangeLanguage(v))
            self.language("en");
        else
            IPCRequestTask(IPCRequestAction.SetProperty, {prop: "lang", value: v}, undefined);
    })

    // Load state
    // Get domains ruleset from storage
    chrome.runtime.sendMessage({action: "getDomains"}, function (result) {
        if (result.length) {
            result.forEach(function (domain) {
                self.appendDomainRuleset(new DomainRulesetViewModel(domain));
            });
        }
    });

    // Load settings from storage
    self.LoadSettings = async function (){
        return await Promise.all([
            IPCRequestPromise(IPCRequestAction.GetProperty, {prop: "lang"},
                v => self.language((ChangeLanguage(v.value) ? v.value : "en"))),

            // Get theme setting
            IPCRequestPromise(IPCRequestAction.GetProperty, {prop: "theme"},
                v => self.selectedTheme((ChangeThemeColourPalette(v.value) ? v.value : "dark"))),

            // Get 'prefer narrow sidebar' status
            IPCRequestPromise(IPCRequestAction.GetPropertyAsBool, {prop: "prefer-narrow-side-bar"},
                v => self.isPreferNarrowSideBar((v.value === undefined ? false : v.value))),

            // Get last selected tab
            IPCRequestPromise(IPCRequestAction.GetProperty, {prop: "last-tab"},
                v => self.selectedTab((IsEntryExist(v.value) ? v.value : defaultStartPage)))
        ]);
    }
}

let viewModel = null;

let pushToast = function (msg, button) {
    const vm = {
        text: ko.observable(msg),
        button: ko.observable(button),
        isDismissed: false
    };

    new Promise(function (resolve) {
        viewModel.toasts.push(vm);
        resolve();
    }).then(_ => {
        setTimeout(function () {
            vm.isDismissed = true;
            viewModel.toasts.remove(vm);
        }, 5000);
    });
    return vm;
}

const createViewModel = async function (){
    const vm = new ExtensionOptionsViewModel();
    viewModel = vm;
    await vm.LoadSettings();
}

new Promise(r => createViewModel().then(r))
    .then(_ => importTemplatesListToHead(templatesImportList))
    .then(_ => ko.applyBindings(viewModel))
    .catch(function (e) {
        const vm = new function (){
            this.isSuccess = ko.observable(false);
            this.message = ko.observable(e.message);
            this.stack = ko.observable(e.stack);
        }
        ko.cleanNode(document.body);
        ko.applyBindings(vm);
    });
