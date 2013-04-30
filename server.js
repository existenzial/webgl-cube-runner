var consolidate = require("consolidate"),
    express     = require("express");

var app = express();

app.use(express.static(__dirname + "/public"));
app.engine("html", consolidate.underscore);

app.get("/", function(req, res) {
    res.render("index.html", {message: "Hello, world"});
});

app.listen(3000);
