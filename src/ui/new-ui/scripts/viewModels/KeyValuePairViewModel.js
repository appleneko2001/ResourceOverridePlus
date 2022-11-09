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
