var consolidate = require("consolidate"),
    express     = require("express"),
    faye        = require("faye"),
    mobile      = require("connect-mobile-detection"),
    os          = require("os");

var app = express();

app.set("port", 3000);
app.use(express.static(__dirname + "/public"));
app.engine("html", consolidate.underscore);

app.get("/", mobile(), function(req, res) {
    res.redirect(req.mobile ? "/controller" : "/game");
});

app.get("/controller", function(req, res) {
    res.render("controller.html", {});
});

app.get("/game", function(req, res) {
    res.render("game.html", {message: "game"});
});

var httpServer = app.listen(app.get("port"));
var bayeux = new faye.NodeAdapter({mount: "/pubsub"});
bayeux.attach(httpServer);

var url = "http://" + os.hostname() + ":" + app.get("port");
console.log(url);
