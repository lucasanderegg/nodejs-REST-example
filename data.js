var data = {addresses:[{}]};
	
data.getId = function (id) {
	for (var i = 0; i < this.addresses.length; i++){
		if (this.addresses[i].id == id) {
			return this.addresses[i];
		}
	}
	return '';
}

data.filter = function (attribute, value) {
	if (!this.addresses[0].hasOwnProperty(attribute)) {
		return '';
	}
	var selectedAddresses = [];
	for (var i = 0; i < this.addresses.length; i++){
		if (this.addresses[i].attribute == value) {
			selectedAddresses.push(this.addresses[i]);
		}
	}
	return selectedAddresses;
}

module.exports.data = data;