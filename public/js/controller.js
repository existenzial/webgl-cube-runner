var StatusView = Backbone.View.extend({
    template: _.template('<div id="status" class="<%= state %>"><%= message %></div>'),
    states: { SUCCESS: "success", WARNING: "warning", ERROR: "error" },

    initialize: function() {
        this.update(this.states.WARNING, "initialized");
    },

    update: function(state, message) {
        console.log("status: " + message);
        this.render(state, message);
    },

    render: function(state, message) {
        this.$el.html(this.template({state: state, message: message}));
        return this;
    }
});

var App = {
    initialize: function() {
        var self = this;

        self.statusView = new StatusView({el: $("#status-view")});
        self.orientationMessage = _.template("alpha: <%= alpha %><br/>beta: <%= beta %><br/>gamma: <%= gamma %>");

        if (!window.DeviceOrientationEvent) {
            self.statusView.update(self.statusView.ERROR, "unsupported");
            return;
        }

        self.pubsubClient = new Faye.Client("/pubsub");
        self.pubsubConnected = true;
        self.pubsubSubscription = self.pubsubClient.subscribe("/game", self.onPubsubMessage);
        self.statusView.update(self.statusView.states.WARNING, "subscribing");

        self.pubsubSubscription.callback(function() {
            self.statusView.update(self.statusView.states.SUCCESS, "subscribed");

            self.pubsubClient.bind("transport:up", function() {
                self.pubsubConnected = true;
                self.statusView.update(self.statusView.states.SUCCESS, "subscribed");
            });

            self.pubsubClient.bind("transport:down", function() {
                self.pubsubConnected = false;
                self.statusView.update(self.statusView.states.ERROR, "disconnected");
            });

            $(window).on("deviceorientation", _.bind(self.onDeviceOrientationEvent, self));
            self.statusView.update(self.statusView.states.SUCCESS, "listening");
        });

        self.pubsubSubscription.errback(function() {
            self.statusView.update(self.statusView.states.ERROR, "subscription failed");
        });
    },

    onPubsubMessage: function(message) {
        console.log("pubsub: " + message);
    },

    onDeviceOrientationEvent: function(event) {
        var data = _.pick(event.originalEvent, "alpha", "beta", "gamma");
        if (_.contains(_.values(data), null)) { return; }
        var displayData = data;
        _.each(displayData, function(value, key, object) {
            object[key] = parseFloat(value).toFixed(1);
        });
        console.log("orientation: " + JSON.stringify(displayData));
        if (this.pubsubConnected) {
            this.statusView.update(this.statusView.states.SUCCESS, this.orientationMessage(displayData));
        }
        this.pubsubClient.publish("/controller", data);
    }
};

$(function() {
    window.App = App;
    App.initialize();
});
