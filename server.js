var consolidate = require("consolidate"),
    express     = require("express"),
    mobile      = require("connect-mobile-detection");

var app = express();

app.use(express.static(__dirname + "/public"));
app.engine("html", consolidate.underscore);

app.get("/", mobile(), function(req, res) {
    if (req.mobile) {
        res.render("controller.html", {message: "controller"});
    } else {
        res.render("game.html", {message: "game"});
    }
});

app.listen(3000);
