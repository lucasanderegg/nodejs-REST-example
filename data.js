var data = {};
	
data.getId = function (resource, id) {
	for (var i = 0; i < this[resource].length; i++){
		if (this[resource][i].id == id) {
			return this[resource][i];
		}
	}
	return '';
}

data.filter = function (resource, parameters) {
	var attributes = getNonMethods(parameters);
	var selectedElements = [];
	
	for(var i = 0; i < attributes.length; i++){
		var attribute = attributes[i];
		if (this[resource][0].hasOwnProperty(attribute)) {
			var value = parameters[attribute];
			for (var i2 = 0; i2 < this[resource].length; i2++){
				if (this[resource][i2][attribute] == value) {
					selectedElements.push(this[resource][i2]);
				}
			}
		}
	}
	return selectedElements;
}


function getNonMethods(obj)
{
    var res = [];
    for(var m in obj) {
        if(typeof obj[m] != "function") {
            res.push(m)        }
    }
    return res;
}

module.exports.data = data;