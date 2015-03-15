
var GovnabaMessager = function(gvnb) {

    this.gvnb = gvnb;
    this.hostname = "localhost:8080"
    this.socket = new WebSocket("ws://" + this.hostname + "/connect");

    this.socket.onopen = function() {
        console.log("Connected.");
        gvnb.initialize();
    }

    this.socket.onerror = function(e) {
        console.log(e);
        //TODO handle
    }

    this.socket.onmessage = function(e) {
        msg = JSON.parse(e.data);
        switch(msg.MessageType) {
            case 6: {
                gvnb.onBoardListMessage(msg);
                break;
            }
            case 8: {
                gvnb.onBoardThreadsMessage(msg);
            }
        }
    }
    
    this.getBoards = function() {
        this.socket.send(JSON.stringify(
        {
           MessageType: 5 
        }));
    }

    this.getBoardPage = function(board, page) {
        this.socket.send(JSON.stringify({
            MessageType: 7,
            Board: board,
            Count: 10,
            SkipBatches: page
        }));
    }
}


Govnaba = function() {

    this.msgr = new GovnabaMessager(this)
    this.views = new GovnabaViews();
    
    this.initialize = function() {
        page('/', this.navMainPage.bind(this));
        page('/:board/', this.navBoardPage.bind(this));
        page();
        this.views.showBase();
        this.msgr.getBoards();
    }

    this.navMainPage = function(ctx) {
    }

    this.navBoardPage = function(ctx) {
        this.msgr.getBoardPage(ctx.params.board, 0);
    }

    this.onBoardThreadsMessage = function(msg) {
        this.views.showBoardPage(msg);
    }

    this.onBoardListMessage = function(msg) {
        this.views.showBoardList(msg.Boards.filter(function (name) { return name.length > 0 }));
    }
}


document.addEventListener("DOMContentLoaded", function () {
    gvnb = new Govnaba();
});