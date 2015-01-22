
var GovnabaMessager = function(socket) {

    this.socket = socket;
    
    this.index = function(ctx) {
        console.log(this);
        this.socket.send(JSON.stringify(
        {
           MessageType: 5 
        }));
    }
}

document.addEventListener("DOMContentLoaded", function () {
    var hostname = "localhost:8080"
    var socket = new WebSocket("ws://" + hostname + "/connect");
    var views = new GovnabaViews();

    socket.onopen = function() {
        console.log("Connected.");
        var msgr = new GovnabaMessager(socket);
        page('/', msgr.index.bind(msgr));
        page();
    }

    socket.onerror = function(e) {
        console.log(e);
        //TODO handle
    }

    socket.onmessage = function(e) {
        console.log(e.data);
        msg = JSON.parse(e.data);
        switch(msg.MessageType) {
            case 6: {
                views.index(msg.Boards.filter(function (name) { return name.length > 0 }));
            }
        }
    }
});