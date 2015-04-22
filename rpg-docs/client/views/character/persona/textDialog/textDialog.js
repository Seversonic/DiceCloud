Template.textDialog.onRendered(function(){
	updatePolymerInputs(this);
});

Template.textDialog.helpers({
	value: function(){
		var fieldSelector = {fields: {}};
		fieldSelector.fields[this.field] = 1;
		var char = Characters.findOne(this.charId, fieldSelector);
		return char[this.field];
	}
});

Template.textDialog.events({
	"change #textInput": function(event){
		var input = event.currentTarget.value;
		var setter = {$set: {}};
		setter.$set[this.field] = input;
		Characters.update(this.charId, setter);
	}
});
