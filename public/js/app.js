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
        var self = this;

        self.set({alpha: null, beta: null, gamma: null});

        var threshold     = 10.0,
            leftArrowKey  = 37,
            rightArrowKey = 39;

        self.on("change:gamma", function(model, gamma) {
            if (Math.abs(gamma) < threshold) {
                self.triggerKeyEvent("keyup", leftArrowKey);
                self.triggerKeyEvent("keyup", rightArrowKey);
            } else {
                self.triggerKeyEvent(
                    "keyup",   gamma < 0 ? rightArrowKey : leftArrowKey);
                self.triggerKeyEvent(
                    "keydown", gamma < 0 ? leftArrowKey  : rightArrowKey);
            }
        });
    },

    triggerKeyEvent: function(eventType, keyCode) {
        var keyEvent = $.Event(eventType);
        keyEvent.keyCode = keyCode;
        $(document).trigger(keyEvent);
    }
});

var GameView = Backbone.View.extend({
    initialize: function() {
        this.$canvas = this.$el.find("#game-view-canvas");
        this.$placeholder = this.$el.find("#game-view-placeholder");

        this.$canvas.attr("width",  this.$canvas.css("width"));
        this.$canvas.attr("height", this.$canvas.css("height"));

        this.$placeholder.css("width",  this.$canvas.css("width"));
        this.$placeholder.css("height", this.$canvas.css("height"));
        this.$placeholder.css("top",    this.$canvas.offset().top);
        this.$placeholder.css("left",   this.$canvas.offset().left);

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
        var self = this;
        $(document).keydown(function(e) {
            if (e.keyCode === 32) {
                $(this).off(e);
                webGLStart(self.$canvas.attr("id"));
            }
        });
    }
});

var ScoreModel = Backbone.Model.extend({
    initialize: function() {
        this.set("points", 0);
    },

    getScore: function() {
        return this.get("points");
    },

    incrementScore: function(amount) {
        if (!amount) { amount = 1; }
        this.set("points", this.get("points") + amount);
    },

    resetScore: function() {
        this.set("points", 0);
    }
});

var ScoreView = Backbone.View.extend({
    template: _.template(
        '<div id="score"><%= points %> <%= pointsMsg %></div>'),

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

        window.getScore = _.bind(
            self.scoreModel.getScore, self.scoreModel);
        window.incrementScore = _.bind(
            self.scoreModel.incrementScore, self.scoreModel);
        window.resetScore = _.bind(
            self.scoreModel.resetScore, self.scoreModel);

        self.pubsubClient = new Faye.Client("/pubsub");
        self.pubsubConnected = true;
        self.pubsubSubscription = self.pubsubClient.subscribe(
            "/controller",
            function(message) {
                self.controllerModel.set({
                    alpha: parseFloat(message.alpha),
                    beta:  parseFloat(message.beta),
                    gamma: parseFloat(message.gamma)
                });
            }
        );
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
    }
};

$(function() {
    App.initialize();
});
