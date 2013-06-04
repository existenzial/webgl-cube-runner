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

var getQrCodePath = function() {
    if (hostname === "dmv-air.local") { return "/img/qr_fallback.png"; }
    var controllerUrlEncoded = encodeURIComponent(baseUrl + "/controller");
    return "https://chart.googleapis.com/chart?chs=100x100&cht=qr&chl=" + controllerUrlEncoded + "&choe=UTF-8&chld=|0";
}

var hostname = os.hostname();
var host = hostname.indexOf(".local") !== -1 ? hostname : getLocalAddress();
var baseUrl = "http://" + host + ":" + app.get("port");

app.get("/controller", function(req, res) {
    res.render("controller.html", {});
});

app.get("/game", function(req, res) {
    res.render("game.html", {
        qrCodePath: getQrCodePath()
    });
});

var httpServer = app.listen(app.get("port"));
var bayeux = new faye.NodeAdapter({mount: "/pubsub"});
bayeux.attach(httpServer);

open(baseUrl + "/game");
