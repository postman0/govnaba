
var GovnabaMessager = function(socket) {

    this.socket = socket;
    
    this.index = function(ctx) {
        this.socket.send(JSON.stringify(
        {
           MessageType: 5 
        }));
    }

    this.requestBoardPage = function(ctx) {
        this.socket.send(JSON.stringify({
            MessageType: 7,
            Board: ctx.params.board,
            Count: 10,
            SkipBatches: 0
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
        page('/:board/', msgr.requestBoardPage.bind(msgr));
        page();
    }

    socket.onerror = function(e) {
        console.log(e);
        //TODO handle
    }

    socket.onmessage = function(e) {
        msg = JSON.parse(e.data);
        switch(msg.MessageType) {
            case 6: {
                views.index(msg.Boards.filter(function (name) { return name.length > 0 }));
                break;
            }
            case 8: {
                views.showBoardPage(msg);
            }
        }
    }
});