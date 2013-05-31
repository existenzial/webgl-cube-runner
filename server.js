var consolidate = require("consolidate"),
    express     = require("express"),
    faye        = require("faye"),
    open        = require("open"),
    os          = require("os");

var app = express();

app.set("port", 3000);
app.use(express.static(__dirname + "/public"));
app.engine("html", consolidate.underscore);

var getLocalAddress = function() {
    var interfaces = os.networkInterfaces();
    var addresses = [];
    for (var key1 in interfaces) {
        for (var key2 in interfaces[key1]) {
            var address = interfaces[key1][key2];
            if (address.family === "IPv4" && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    return addresses[0];
}

var hostname = os.hostname();
var host = hostname.indexOf(".local") !== -1 ? hostname : getLocalAddress();
var baseUrl = "http://" + host + ":" + app.get("port");

app.get("/controller", function(req, res) {
    res.render("controller.html", {});
});

app.get("/game", function(req, res) {
    res.render("game.html", {
        controllerUrlEncoded: encodeURIComponent(baseUrl + "/controller")
    });
});

var httpServer = app.listen(app.get("port"));
var bayeux = new faye.NodeAdapter({mount: "/pubsub"});
bayeux.attach(httpServer);

open(baseUrl + "/game");
