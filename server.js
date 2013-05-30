var consolidate = require("consolidate"),
    express     = require("express"),
    faye        = require("faye"),
    open        = require("open"),
    os          = require("os");

var app = express();

app.set("port", 3000);
app.use(express.static(__dirname + "/public"));
app.engine("html", consolidate.underscore);

var baseUrl = "http://" + os.hostname() + ":" + app.get("port");

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
