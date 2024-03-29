var StatusView = Backbone.View.extend({
    template: _.template('<div id="status" class="<%= type %>"><%= message %></div>'),

    initialize: function() {
        this.info("initialized");
    },

    info: function(message) {
        console.log("status: " + message);
        this.render("info", message);
    },

    warning: function(message) {
        console.warn("status: " + message);
        this.render("warning", message);
    },

    error: function(message) {
        console.error("status: " + message);
        this.render("error", message);
    },

    render: function(type, message) {
        this.$el.html(this.template({type: type, message: message}));
        return this;
    }
});

var App = {
    initialize: function() {
        var self = this;

        self.statusView = new StatusView({el: $("#status-view")});
        self.maxUpdateIntervalMs = 100;
        self.orientationMessage = _.template("alpha: <%= alpha %><br/>beta: <%= beta %><br/>gamma: <%= gamma %>");

        if (!window.DeviceOrientationEvent) {
            self.statusView.error("unsupported");
            return;
        }

        self.pubsubClient = new Faye.Client("/pubsub");
        self.pubsubConnected = true;
        self.pubsubSubscription = self.pubsubClient.subscribe("/game", _.bind(self.onPubsubMessage, self));
        self.statusView.info("subscribing");

        self.pubsubSubscription.callback(function() {
            self.statusView.info("subscribed");

            $(window).on("deviceorientation", _.throttle(
                _.bind(self.onDeviceOrientationEvent, self),
                self.maxUpdateIntervalMs
            ));
            self.statusView.info("listening");

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
    },

    onDeviceOrientationEvent: function(event) {
        var data = _.pick(event.originalEvent, "alpha", "beta", "gamma");

        if (_.contains(_.values(data), null)) {
            this.statusView.error("unsupported");
            return;
        }

        var displayData = data;
        _.each(displayData, function(value, key, object) {
            object[key] = parseFloat(value).toFixed(1);
        });

        console.log("orientation: " + JSON.stringify(displayData));
        if (this.pubsubConnected) {
            this.statusView.info(this.orientationMessage(displayData));
        }

        this.pubsubClient.publish("/controller", data);
    }
};

$(function() {
    window.App = App;
    App.initialize();
});
