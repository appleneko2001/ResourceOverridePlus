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
