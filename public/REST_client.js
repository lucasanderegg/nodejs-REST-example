// https://de.wikipedia.org/wiki/XMLHttpRequest
// normale http requests werden wohl ausgeführt bei eingabe der addresse in den browser 
// zwei xmlhttprequest objecte damit kein durcheinander
// message order kontrollieren

var restGetRequest1 = new XMLHttpRequest();
var restGetRequest2 = new XMLHttpRequest();


function sendRestGetRequest1() {
	
	restGetRequest1.open ('get',"/addresses", true);
	restGetRequest1.setRequestHeader("Authorization", "Basic " + btoa("red:red"));
	restGetRequest1.onreadystatechange = function () {
		document.getElementById("chatwindow").value = restGetRequest1.responseText;
	}
    restGetRequest1.send (null);
}

function sendRestGetRequest2() {
	restGetRequest2.open ('get',"/addresses/2", true);
	restGetRequest2.onreadystatechange = function () {
		document.getElementById("chatwindow").value = restGetRequest2.responseText;
	}
    restGetRequest2.send (null);
}