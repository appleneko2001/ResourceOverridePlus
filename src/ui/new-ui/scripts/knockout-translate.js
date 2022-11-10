const LanguagesService = new function (){
    const defaultLanguageLocale = "en";
    const cookieKey = "lang";
    const fallbackLangLinkId = "fallback-language";

    const languagesMap = new Map([
        ["en", "English"],
        ["zh", "中文"]
    ]);

    const textMap = new Map([
        ["_", "Unit"]
    ]);

    // This way pretty hacky
    // We create once observable for entries of language bundle
    // Then pass observable to ko.unwrap method to let it bind.

    // After change language we trigger valueHasMutated method for each observable.

    const observableMap = new Map();

    const selectedLanguage = ko.observable(defaultLanguageLocale);

    const loadSettings = () => IPCRequestPromise(IPCRequestAction.GetProperty, {prop: cookieKey},
        v => selectedLanguage((changeLanguage(v.value) ? v.value : defaultLanguageLocale)));

    const changeLanguage = function (locale){
        if (!changeLanguageCore(locale))
        {
            selectedLanguage("en");
            return false;
        }
        else
        {
            IPCRequestTask(IPCRequestAction.SetProperty, {prop: "lang", value: locale}, undefined);
            return true;
        }
    }

    const changeLanguageCore = function (locale){
        if(!languagesMap.has(locale))
            return false;

        const href = `resources/languages/${locale}.html`;

        const instance = new LanguageInstance(href);
        instance.Load().then((instance) => {
            for(const node of instance.Entries)
                textMap.set(node[0], node[1]);

            let notified = false;
            function toast(){
                if(notified)
                    return;
                pushToast(`Please wait... Change language to ${instance.Name}`);
                notified = true;
            }

            // Very tricky and hacky way to make it.
            for (const binding of observableMap.entries()){
                toast();
                binding[1].valueHasMutated();
            }
        });

        return true;
    }

    const getTranslatedString = function (key){
        const result = textMap.get(key);
        if(result === undefined)
            return key;

        return result;
    }

    const LanguageInstance = function (href){
        const link = href;

        const dict = new Map();
        let name = "Language Instance";

        const self = this;

        self.Load = async function () {
            const templates = document.createElement('template');
            templates.innerHTML = await (await fetch(link)).text();

            const elements = Array.from(templates.content.children);

            for (const element of elements) {
                switch (element.tagName) {
                    case 'SCRIPT': {
                        dict.set(element.id, element.innerHTML);
                    }
                        break;

                    case 'TITLE': {
                        self.Name = element.textContent;
                    }
                        break;
                }
            }

            return self;
        };

        self.Name = name;
        self.GetString = dict.get;
        self.Entries = dict.entries();
    }

    const knockoutHandler = function() {
        function processAccessor(valueAccessor, onUndefined, onSuccess){
            const value = valueAccessor();

            let o;
            let key;
            let params;

            switch (typeof value){
                case "string":{
                    key = value;
                }break;

                case "object":{
                    key = value.key;
                    params = value.params;
                }break;
            }

            o = observableMap.get(key);

            if(o === undefined){
                o = onUndefined(o, key);

                if(o === undefined)
                    return;
            }

            onSuccess(o, params);
        }

        function apply (o, params, element) {
            const value = ko.unwrap(o);
            let str = getTranslatedString(value);

            for(const key in params){
                if(params.hasOwnProperty(key))
                {
                    str = str.trim(' ');
                    str = str.replace(`{{${key}}}`, ko.unwrap(params[key]));
                }
            }
            // TODO: allow re-bind after change inner HTML
            element.innerHTML = str;
        }

        return {
            init: function(element, valueAccessor){
                processAccessor(valueAccessor, function (o, key){
                    o = ko.observable(key);
                    observableMap.set(key, o);
                    return o;
                }, (o, params) => apply(o, params, element));
            },

            update: function(element, valueAccessor) {
                processAccessor(valueAccessor,

                    // This shouldn't be happened
                    // because we have set all related observable for each entry.
                    // Rarely lol
                    function (o, key){
                    element.innerHTML = key;
                    return key;
                }, (o, params) => apply(o, params, element));
            }
        };
    }();

    selectedLanguage.subscribe((newLocale) => changeLanguage(newLocale));

    const l = document.head.querySelector(`link#${fallbackLangLinkId}`);
    new LanguageInstance(l.href)
        .Load().then((instance) => {

        for(const node of instance.Entries)
            textMap.set(node[0], node[1]);
    });

    return {
        KnockoutHandler: knockoutHandler,
        LanguageListing: languagesMap,
        Language: selectedLanguage,
        LoadSettings: loadSettings
    }
}

ko.bindingHandlers.translate = LanguagesService.KnockoutHandler;
