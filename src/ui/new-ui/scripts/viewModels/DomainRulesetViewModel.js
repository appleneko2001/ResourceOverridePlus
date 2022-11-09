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
