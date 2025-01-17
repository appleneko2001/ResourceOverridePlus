// Knockout codemirror binding handler
ko.bindingHandlers.codemirror = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        function initEditor(){
            const editor = CodeMirror(element, options);

            editor.setValue(options.text() ?? "");
            editor.refresh();

            editor.on('change', function(cm) {
                const value = valueAccessor();
                value.text(cm.getValue());
            });

            element.editor = editor;
        }

        const options = ko.unwrap(valueAccessor()) || {};
        /*
        if(options.text !== undefined)
            options.value = options.text();*/

        if(options.isActive !== undefined){
            const observable = options.isActive;
            observable.subscribe(vm => {
                if(vm === true)
                    initEditor();
                else
                {
                    element.editor = null;
                    while (element.hasChildNodes())
                        element.removeChild(element.lastChild);
                }
            })
        }
        else
            initEditor();
    },
    update: function(element) {
        if (element.editor)
            element.editor.refresh();
    }
};
