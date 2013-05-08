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

        self.pubsubClient = new Faye.Client("/pubsub");
        self.pubsubSubscription = self.pubsubClient.subscribe("/game", self.pubsubMessage);
        self.statusView.update(self.statusView.states.WARNING, "subscribing");

        self.pubsubSubscription.callback(function() {
            self.statusView.update(self.statusView.states.SUCCESS, "subscribed");

            self.pubsubClient.bind("transport:up", function() {
                self.statusView.update(self.statusView.states.SUCCESS, "subscribed");
            });

            self.pubsubClient.bind("transport:down", function() {
                self.statusView.update(self.statusView.states.ERROR, "disconnected");
            });

            // ...
        });

        self.pubsubSubscription.errback(function() {
            self.statusView.update(self.statusView.states.ERROR, "subscription failed");
        });
    },

    pubsubMessage: function(message) {
        console.log("pubsub: " + message);
    }
};

$(function() {
    window.App = App;
    App.initialize();
});
