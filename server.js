var consolidate = require("consolidate"),
    express     = require("express"),
    faye        = require("faye"),
    mobile      = require("connect-mobile-detection"),
    open        = require("open"),
    os          = require("os");

var app = express();

app.set("port", 3000);
app.use(express.static(__dirname + "/public"));
app.engine("html", consolidate.underscore);

app.get("/", mobile(), function(req, res) {
    if (req.mobile) {
        res.render("controller.html", {message: "controller"});
    } else {
        res.render("game.html", {message: "game"});
    }
});

var httpServer = app.listen(app.get("port"));
var bayeux = new faye.NodeAdapter({mount: "/pubsub"});
bayeux.attach(httpServer);

open("http://" + os.hostname() + ":" + app.get("port"));
