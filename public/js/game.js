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

var App = {
    initialize: function() {
        var self = this;

        self.statusView = new StatusView();
        self.controllerModel = new ControllerModel();

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
    },

    controllerOrientation: function() {
        return this.controllerModel.orientation();
    }
};

$(function() {
    window.App = App;
    App.initialize();
});
