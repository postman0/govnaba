
var GovnabaMessager = function(gvnb) {

    this.gvnb = gvnb;
    this.hostname = document.domain + ":8080"
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
            case 11: {
                gvnb.onFileUploadSuccess(msg);
                break;
            }
            case 12:
            case 13:
            case 14: {
                gvnb.onError(msg)
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

    this.createThread = function(board, topic, contents, attrs) {
        this.socket.send(JSON.stringify({
            MessageType: 2,
            Board: board,
            Topic: topic,
            Contents: contents,
            Attrs: attrs
        }));
    }

    this.addPost = function(board, topic, contents, thread, attrs) {
        this.socket.send(JSON.stringify({
            MessageType: 4,
            Board: board,
            Topic: topic,
            Contents: contents,
            ThreadLocalId: thread,
            Attrs: attrs
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

    this.uploadFile = function(file) {
        this.socket.send(file)
    }
}


Govnaba = function() {

    this.msgr = new GovnabaMessager(this)
    this.baseCont = GovnabaViews.mountBaseContainer();
    this.state = {};
    
    this.initialize = function() {
        page('*', this.parseQueryString.bind(this));
        page('/', this.navMainPage.bind(this));
        page('/:board/', this.navBoardPage.bind(this));
        page("/:board/:localid", this.navThreadPage.bind(this));
        page();
    }

    this.parseQueryString = function(ctx, next) {
        ctx.query = qs.parse(ctx.querystring);
        next();
    }

    this.getThreadLink = function(opLocalId, postLocalId) {
        return '/' + this.state.board + '/' + opLocalId.toString() + "#" + postLocalId.toString();
    }

    this.navMainPage = function(ctx) {
        this.msgr.getBoards();
        this.msgr.changeLocation("mainPage", "");
    }

    this.navBoardPage = function(ctx) {
        var page = parseInt(ctx.query.page || "0");
        this.msgr.getBoardPage(ctx.params.board, page);
        this.state.board = ctx.params.board;
        this.state.page = page;
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
        // use board subscription instead
        this.msgr.changeLocation("board", msg.Board);
    }

    this.onNewThreadMessage = function(msg) {
        this.baseCont.displayNewThread([{
            Topic: msg.Topic,
            Contents: msg.Contents,
            ThreadId: msg.LocalId,
            LocalId: msg.LocalId,
            Date: msg.Date,
            Attrs: msg.Attrs
        }]);
    }

    this.onNewPostMessage = function(msg) {
        this.baseCont.displayNewPost({
            Topic: msg.Topic,
            Contents: msg.Contents,
            LocalId: msg.AnswerLocalId,
            Date: msg.Date,
            Attrs: msg.Attrs
        });
    }

    this.onError = function(msg) {
        $('.postform > form').append('\
            <div class="form-group">\
                <div class="form-error alert alert-danger col-sm-offset-2 col-sm-10">' +
                    function() {if (msg.ErrorMessage) {
                        return msg.ErrorMessage
                    } else if (msg.MessageType == 13) {
                        return "Загрузка файла не удалась."
                    } else if (msg.MessageType == 14) {
                        return "Внутренняя ошибка сервера."
                    }}() +
                '</div>\
            </div>');
    }

    this.sendPostingForm = function(evt) {
        var fileList = document.getElementById("input_file").files;
        if (fileList.length > 0) {
            this.msgr.uploadFile(fileList[0]);
        } else {
            var attrs = {};
            var topic = document.getElementById("input_topic").value;
            var contents = document.getElementById("input_contents").value;
            if (document.getElementById("input_sage").checked)
                attrs.sage = true;
            if (document.getElementById("input_op").checked)
                attrs.op = true;

            if (this.baseCont.state.ctx == ViewContext.BOARD) {
                this.msgr.createThread(this.state.board, topic, contents, attrs);
            }
            else if (this.baseCont.state.ctx == ViewContext.THREAD) {
                this.msgr.addPost(this.state.board, topic, contents, this.state.thread, attrs);
            }
        }
        evt.preventDefault();
    }

    this.onFileUploadSuccess = function(msg) {
        var topic = document.getElementById("input_topic").value;
        var contents = document.getElementById("input_contents").value;
        var attrs = {"images": [msg.Filename]}
        if (document.getElementById("input_sage").checked)
            attrs.sage = true;
        if (document.getElementById("input_op").checked)
            attrs.op = true;
        
        if (this.baseCont.state.ctx == ViewContext.BOARD) {
            this.msgr.createThread(this.state.board, topic, contents, attrs);
        }
        else if (this.baseCont.state.ctx == ViewContext.THREAD) {
            this.msgr.addPost(this.state.board, topic, contents, this.state.thread, attrs);
        }
    }
}


document.addEventListener("DOMContentLoaded", function () {
    gvnb = new Govnaba();
});
