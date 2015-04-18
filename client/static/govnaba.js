
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
        console.log(msg);
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
            case 2: {
                gvnb.onNewThreadMessage(msg);
                break;
            }
            case 4: {
                gvnb.onNewPostMessage(msg);
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

    this.createThread = function(board, topic, contents) {
        this.socket.send(JSON.stringify({
            MessageType: 2,
            Board: board,
            Topic: topic,
            Contents: contents
        }));
    }

    this.addPost = function(board, topic, contents, thread) {
        this.socket.send(JSON.stringify({
            MessageType: 4,
            Board: board,
            Topic: topic,
            Contents: contents,
            ThreadLocalId: thread
        }));
    }

    this.changeLocation = function(locationType, location) {
        var locType = ["mainPage", "board", "thread"].indexOf(locationType);
        var loc = location.toString();
        this.socket.send(JSON.stringify({
            MessageType: 3,
            LocationType: locType,
            NewLocation: loc
        }));
    }
}


Govnaba = function() {

    this.msgr = new GovnabaMessager(this)
    this.baseCont = GovnabaViews.mountBaseContainer();
    this.state = {};
    
    this.initialize = function() {
        page('/', this.navMainPage.bind(this));
        page('/:board/', this.navBoardPage.bind(this));
        page("/:board/:localid", this.navThreadPage.bind(this));
        page();
    }

    this.getThreadLink = function(opLocalId, postLocalId) {
        return '/' + this.state.board + '/' + opLocalId.toString() + "#" + postLocalId.toString();
    }

    this.navMainPage = function(ctx) {
        this.msgr.getBoards();
        this.msgr.changeLocation("mainPage", "");
    }

    this.navBoardPage = function(ctx) {
        this.msgr.getBoardPage(ctx.params.board, 0);
        this.state.board = ctx.params.board;
    }

    this.navThreadPage = function(ctx) {
        this.msgr.getThread(ctx.params.board, parseInt(ctx.params.localid));
        this.state.board = ctx.params.board;
        this.state.thread = parseInt(ctx.params.localid);
    }

    this.onBoardThreadsMessage = function(msg) {
        this.baseCont.displayBoard(msg);
        this.msgr.changeLocation("board", this.state.board);
    }

    this.onBoardListMessage = function(msg) {
        this.baseCont.displayMainPage(msg.Boards.filter(function (name) { return name.length > 0 }));
    }

    this.onThreadMessage = function(msg) {
        this.baseCont.displayThread(msg.Posts);
        // not implemented serverside
        //this.msgr.changeLocation("thread", this.state.thread);
    }

    this.onNewThreadMessage = function(msg) {

    }

    this.onNewPostMessage = function(msg) {
        
    }

    this.sendPostingForm = function(evt) {
        var topic = document.getElementById("input_topic").value;
        var contents = document.getElementById("input_contents").value;
        if (this.baseCont.state.ctx == ViewContext.BOARD) {
            this.msgr.createThread(this.state.board, topic, contents);
        }
        else if (this.baseCont.state.ctx == ViewContext.THREAD) {
            this.msgr.addPost(this.state.board, topic, contents, this.state.thread);
        }
        evt.preventDefault();
    }
}


document.addEventListener("DOMContentLoaded", function () {
    gvnb = new Govnaba();
});