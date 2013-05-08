var StatusView = Backbone.View.extend({
    template: _.template('<div id="status" class="<%= state %>"><%= message %></div>'),
    states: { SUCCESS: "success", WARNING: "warning", ERROR: "error" },

    initialize: function() {
        this.update(this.states.WARNING, "Connecting");
    },

    update: function(state, message) {
        this.render(state, message);
    },

    render: function(state, message) {
        this.$el.html(this.template({state: state, message: message}));
        return this;
    }
});

$(function() {
    var statusView = new StatusView({el: $("#status-view")});
});
