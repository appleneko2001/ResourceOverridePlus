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
    "part-templates-import",
    "rules-templates-import",
    "domain-templates-import"
];

const insertHtmlPositionList = [
    // InsertHtmlPosition Explains: https://medium.com/@urgen.nyc/innerhtml-vs-insertadjacenthtml-afec74570afc
    {
        id: InsertHtmlPosition.AfterBegin,
        name: "First"
    }, {
        id: InsertHtmlPosition.BeforeEnd,
        name: "Push"
    },
];

const supportedRulesList = [
    {
        id: "normalOverride",
        name: "WebRequest URL to URL",
        templateKey: "domain-rule-content-normal-override-template"
    }, {
        id: "htmlAttribOverrideOnAppend",
        name: "HTML Element attribute replace (preload)",
        templateKey: "domain-rule-content-html-attrib-override-preload-template"
    }, {
        id: "injectFile",
        name: "Inject File by URL (obsolete, use Inject HTML DOM inline instead).",
        templateKey: "inject-file-url-template"
    }, {
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

Promise.all([
    LanguagesService.LoadSettings(),
    new Promise(r => createViewModel().then(r))
    ]).then(_ => importTemplatesListToHead(templatesImportList))
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
