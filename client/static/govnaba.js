
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
                break;
            }
            case 10: {
                gvnb.onThreadMessage(msg);
                break;
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

    this.getThread = function(board, thread) {
        this.socket.send(JSON.stringify({
            MessageType: 9,
            Board: board,
            LocalId: thread
        }))
    }
}


Govnaba = function() {

    this.msgr = new GovnabaMessager(this)
    this.views = new GovnabaViews();
    this.state = {};
    
    this.initialize = function() {
        page('/', this.navMainPage.bind(this));
        page('/:board/', this.navBoardPage.bind(this));
        page("/:board/:localid", this.navThreadPage.bind(this));
        page();
        this.views.showBase();
        this.msgr.getBoards();
    }

    this.getThreadLink = function(opLocalId, postLocalId) {
        return '/' + this.state.board + '/' + opLocalId.toString() + "#" + postLocalId.toString();
    }

    this.navMainPage = function(ctx) {
    }

    this.navBoardPage = function(ctx) {
        this.msgr.getBoardPage(ctx.params.board, 0);
        this.state.board = ctx.params.board;
    }

    this.navThreadPage = function(ctx) {
        this.msgr.getThread(ctx.params.board, parseInt(ctx.params.localid));
        this.state.board = ctx.params.board;
        this.state.thread = ctx.params.thread;
    }

    this.onBoardThreadsMessage = function(msg) {
        this.views.showBoardPage(msg);
    }

    this.onBoardListMessage = function(msg) {
        this.views.showBoardList(msg.Boards.filter(function (name) { return name.length > 0 }));
    }

    this.onThreadMessage = function(msg) {
        this.views.showThread(msg.Posts)
    }
}


document.addEventListener("DOMContentLoaded", function () {
    gvnb = new Govnaba();
});