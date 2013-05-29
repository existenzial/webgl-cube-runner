var StatusView = Backbone.View.extend({
    initialize: function() {
        this.info("initialized");
    },

    info: function(message) {
        console.log("status: " + message);
    },

    warning: function(message) {
        console.warn("status: " + message);
    },

    error: function(message) {
        console.error("status: " + message);
    }
});

var ControllerModel = Backbone.Model.extend({
    initialize: function() {
        this.set({
            alpha: null,
            beta:  null,
            gamma: null
        });
    },

    orientation: function() {
        return {
            compassDirection: this.get("alpha"),
            tiltSideToSide:   this.get("beta"),
            tiltFrontToBack:  this.get("gamma")
        };
    }
});

var GameView = Backbone.View.extend({
    initialize: function() {
        this.$el.attr("width",  this.$el.css("width"));
        this.$el.attr("height", this.$el.css("height"));

        window.requestAnimFrame = (function() {
            return window.requestAnimationFrame       ||
                   window.webkitRequestAnimationFrame ||
                   window.mozRequestAnimationFrame    ||
                   window.oRequestAnimationFrame      ||
                   window.msRequestAnimationFrame     ||
                   function(callback, element) {
                       window.setTimeout(callback, 1000/60);
                   }
        })();
    },

    render: function() {
        webGLStart(this.el.id);
    }
});

var ScoreModel = Backbone.Model.extend({
    initialize: function() {
        var self = this;
        self.set("points", 0);
        self.set("interval", setInterval(_.bind(self.incrementPoints, self), 100));
    },

    incrementPoints: function() {
        this.set("points", this.get("points") + 1);
    },

    clearInterval: function() {
        clearInterval(this.get("interval"));
    }
});

var ScoreView = Backbone.View.extend({
    template: _.template('<div id="score"><%= points %> <%= pointsMsg %></div>'),

    initialize: function() {
        this.listenTo(this.model, "change", this.render);
    },

    render: function() {
        var context = this.model.attributes;
        context.pointsMsg = context.points === 1 ? "point" : "points";
        this.$el.html(this.template(context));
        return this;
    }
});

var App = {
    initialize: function() {
        var self = this;

        self.scoreModel = new ScoreModel();
        self.controllerModel = new ControllerModel();

        self.statusView = new StatusView();
        self.scoreView = new ScoreView({
            el: $("#score-view"),
            model: self.scoreModel
        });
        self.gameView = new GameView({
            el: $("#game-view")
        });

        window.stopIncrementingPoints = _.bind(self.scoreModel.clearInterval, self.scoreModel);
        window.getControllerOrientation = _.bind(self.controllerModel.orientation, self.controllerModel);

        self.pubsubClient = new Faye.Client("/pubsub");
        self.pubsubConnected = true;
        self.pubsubSubscription = self.pubsubClient.subscribe("/controller", _.bind(self.onPubsubMessage, self));
        self.statusView.info("subscribing");

        self.pubsubSubscription.callback(function() {
            self.statusView.info("subscribed");

            self.pubsubClient.bind("transport:down", function() {
                self.pubsubConnected = false;
                self.statusView.error("disconnected");
            });

            self.pubsubClient.bind("transport:up", function() {
                self.pubsubConnected = true;
                self.statusView.info("listening");
            });

            self.statusView.info("rendering");
            self.scoreView.render();
            self.gameView.render();
        });

        self.pubsubSubscription.errback(function() {
            self.statusView.error("subscribe failed");
        });
    },

    onPubsubMessage: function(message) {
        console.log("pubsub: " + JSON.stringify(message));
        this.controllerModel.set({
            alpha: parseFloat(message.alpha),
            beta:  parseFloat(message.beta),
            gamma: parseFloat(message.gamma)
        });
    }
};

$(function() {
    App.initialize();
});
