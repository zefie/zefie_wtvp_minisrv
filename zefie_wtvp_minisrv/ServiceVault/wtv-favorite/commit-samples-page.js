var minisrv_service_file = true;

var totalfavorites = 0;

var createFun = request_headers.query.Fun;
var createMoney = request_headers.query.Money;
var createMovies = request_headers.query.Movies;
var createNews = request_headers.query.News;
var createRecommended = request_headers.query.Recommended;
var createReference = request_headers.query.Reference;
var folder_array = ssid_sessions[socket.ssid].favstore.getFolders();
totalfavorites = folder_array.length;

if (totalfavorites < 14)
{
	if (createFun == "true")
		ssid_sessions[socket.ssid].favstore.createTemplateFolder("Fun");

	if (createMoney == "true")
		ssid_sessions[socket.ssid].favstore.createTemplateFolder("Money");

	if (createMovies == "true")
		ssid_sessions[socket.ssid].favstore.createTemplateFolder("Movies");

	if (createNews == "true")
		ssid_sessions[socket.ssid].favstore.createTemplateFolder("News");

	if (createRecommended == "true")
		ssid_sessions[socket.ssid].favstore.createTemplateFolder("Recommended");
		console.log("FUGHFVJSGHJFDGIJUFDSHGFJDSKHJKLGFHJKHDJKHJKLGF " + createRecommended)

	if (createReference == "true")
		ssid_sessions[socket.ssid].favstore.createTemplateFolder("Reference");

	headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
Location: wtv-favorite:/favorite
wtv-expire-all: wtv-favorite:`
} else {
	headers = `400 You can only have 14 folders at one time. Delete some folders and try again.`
}