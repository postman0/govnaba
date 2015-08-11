
var GovnabaMessager = function(gvnb) {

    var self = this;
    this.gvnb = gvnb;
    this.hostname = document.domain + ":8080"
    this.socket = new WebSocket("ws://" + this.hostname + "/connect");

    this.socket.onopen = function() {
        console.log("Connected.");
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
                self.onFileUploadSuccess(msg).bind(self);
                break;
            }
            case 12:
            case 13:
            case 14:
            case 22:
            case 23:
            case 24: {
                gvnb.showNotification(msg);
                break;
            }
            case 16: {
                gvnb.onLoginSuccessfulMessage(msg);
                break;
            }
            case 17: {
                gvnb.onPostSuccessfulMessage(msg);
                break;
            }
            case 18: {
                gvnb.onUserCountMessage(msg);
                break;
            }
            case 19: {
                gvnb.onCaptchaMessage(msg);
                break;
            }
            case 20: {
                gvnb.onSinglePostMessage(msg);
                break;
            }
            case 21: {
                gvnb.onConfigMessage(msg);
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
            ThreadId: thread,
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

    this.deletePost = function(board, id) {
        this.socket.send(JSON.stringify({
            MessageType: 22,
            Board: board,
            LocalId: id
        }));
    }

    this.pinThread = function(board, id, state) {
        this.socket.send(JSON.stringify({
            MessageType: 23,
            Board: board,
            LocalId: id,
            State: state
        }));
    }

    this.lockThread = function(board, id, state) {
        this.socket.send(JSON.stringify({
            MessageType: 24,
            Board: board,
            LocalId: id,
            State: state
        }));
    }

    this.uploadFiles = function(fileList) {
        this.pendingFiles = fileList;
        this.completedFiles = [];
        this.uploadFile();
    }

    this.uploadFile = function(file) {
        var file = this.pendingFiles.pop();
        this.socket.send(file);
    }

    this.onFileUploadSuccess = function(msg) {
        this.completedFiles.push(msg.Filename);
        if (this.pendingFiles.length > 0)
            this.uploadFile();
        else {
            var files = this.completedFiles;
            this.completedFiles = [];
            gvnb.onFilesUploadSuccess(files);
        }
    }

    this.attemptLogin = function(key) {
        this.socket.send(JSON.stringify({
            MessageType: 15,
            Key: key
        }))
    }

    this.getNewCaptcha = function() {
        this.socket.send(JSON.stringify({MessageType: 19}));
    }

    this.getSinglePost = function(localId, board) {
        this.socket.send(JSON.stringify({MessageType: 20, Board: board, LocalId: localId}));
    }
}


Govnaba = function() {
    
    this.msgr = new GovnabaMessager(this)
    
    this.initialize = function() {
        this.state = {};
        this.baseCont = GovnabaViews.mountBaseContainer();

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
        return '/' + this.state.board + '/' + opLocalId.toString() + 
            (opLocalId != postLocalId ? "#" + postLocalId.toString() : "");
    }

    this.navMainPage = function(ctx) {
        this.msgr.getBoards();
        this.msgr.changeLocation("mainPage", "");
        this.state = {};
    }

    this.navBoardPage = function(ctx) {
        var page = parseInt(ctx.query.page || "0");
        this.msgr.getBoardPage(ctx.params.board, page);
        this.state.board = ctx.params.board;
        this.state.page = page;
        this.state.thread = null;
    }

    this.navThreadPage = function(ctx) {
        if (parseInt(ctx.params.localid) != this.state.thread) {
            this.msgr.getThread(ctx.params.board, parseInt(ctx.params.localid));
            this.state.board = ctx.params.board;
            this.state.thread = parseInt(ctx.params.localid);
            this.state.scrollTo = ctx.hash;
        } else {
            this.state.scrollTo = ctx.hash;
            this.performScroll();
        }
    }

    this.performScroll = function() {
        console.log(this.state.scrollTo);
        if(this.state.scrollTo) {
            var where = "#post-" + this.state.scrollTo;
            this.state.scrollTo = null;
            scroll(null, $(where).offset().top);
        } else {
            scroll(0, 0);
        }
    }

    this.expandImage = function(evt) {
        var restoreClbk = (function(prevSrc){
            return function(evtNew) {
                evtNew.target.src = prevSrc;
                evtNew.target.onclick = gvnb.expandImage;
                evtNew.stopPropagation();
                evtNew.preventDefault();
            }
        })(evt.target.src);
        evt.target.onclick = restoreClbk;
        evt.target.src = evt.target.parentNode.href;
        evt.stopPropagation();
        evt.preventDefault();
    }

    this.showPostPreview = function(evt) {
        var postParams = evt.currentTarget.dataset;
        if (postParams.threadId == this.state.thread) {
            this.baseCont.displayPreview(parseInt(postParams.postId), 
                evt.pageX, 
                evt.pageY);
        } else {
            if (!this.state.previewCallbacks)
                this.state.previewCallbacks = {};
            this.state.previewCallbacks[postParams.postId] = function(msg) {
                this.baseCont.displayPreview(parseInt(postParams.postId),
                    evt.pageX,
                    evt.pageY,
                    msg);
            };
            this.msgr.getSinglePost(parseInt(postParams.postId), this.state.board);
        }
    }

    this.isBoardFeatureEnabled = function(feature) {
        return _.contains(gvnb.config.BoardConfigs[gvnb.state.board].EnabledFeatures, feature)
    }

    this.deletePost = function(board, id) {
        this.msgr.deletePost(board, id);
    }

    this.pinThread = function(board, id, state) {
        this.msgr.pinThread(board, id, state);
    }

    this.lockThread = function(board, id, state) {
        this.msgr.lockThread(board, id, state);
    }

    this.hasModRights = function() {
        return this.config.IsAdmin || 
        (this.config.ModeratedBoards && this.config.ModeratedBoards.indexOf(this.state.board) != -1);
    }

    this.isAdmin = function() {
        return this.config.IsAdmin;
    }

    this.onConfigMessage = function(msg) {
        this.config = msg;
        this.initialize();
    }

    this.onBoardThreadsMessage = function(msg) {
        this.baseCont.displayBoard(msg);
        this.msgr.changeLocation("board", this.state.board);
        this.msgr.getNewCaptcha();
    }

    this.onBoardListMessage = function(msg) {
        this.baseCont.displayMainPage(msg.Boards.filter(function (name) { return name.length > 0 }));
        this.baseCont.displayUserCount(null);
    }

    this.onThreadMessage = function(msg) {
        this.baseCont.displayThread(msg);
        // not implemented serverside
        //this.msgr.changeLocation("thread", this.state.thread);
        // use board subscription instead
        this.msgr.changeLocation("board", msg.Board);
        this.msgr.getNewCaptcha();
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
        this.baseCont.displayNewPost(msg);
    }

    this.onPostSuccessfulMessage = function(msg) {
        $("#input_topic").val("");
        $("#input_contents").val("");
        $("#input_captcha").val("");
        gvnb.msgr.getNewCaptcha();
    }

    this.onUserCountMessage = function(msg) {
        if (msg.Board == this.state.board)
            this.baseCont.displayUserCount(msg.Count);
    }

    this.onCaptchaMessage = function(msg) {
        localStorage["captcha_id"] = msg.CaptchaId;
        this.baseCont.displayCaptcha(msg.CaptchaImage);
    }

    this.onSinglePostMessage = function(msg) {
        (this.state.previewCallbacks[msg.LocalId].bind(this))(msg);
    }

    this.showNotification = function(msg) {
        if (msg.ErrorMessage) {
            gvnb.baseCont.displayNotification(msg.ErrorMessage)
        } else if (msg.MessageType == 13) {
            gvnb.baseCont.displayNotification("Загрузка файла не удалась.")
        } else if (msg.MessageType == 14) {
            gvnb.baseCont.displayNotification("Внутренняя ошибка сервера.")
        } else if (msg.MessageType == 22) {
            gvnb.baseCont.displayNotification("Пост " + msg.LocalId + " удален.");
        } else if (msg.MessageType == 23) {
            gvnb.baseCont.displayNotification("Пост " + msg.LocalId + (msg.State ? " за" : " от") + "креплен.");
        } else if (msg.MessageType == 24) {
            gvnb.baseCont.displayNotification("Пост " + msg.LocalId + (msg.State ? " за" : " от") + "крыт.");
        };
        gvnb.msgr.getNewCaptcha();
    }

    this.sendPostingForm = function(files) {
        var topic = document.getElementById("input_topic").value;
        var contents = document.getElementById("input_contents").value;
        var attrs = {};
        if (files)
            attrs = _.extend(attrs, files);
        // process checkbox attrs
        $('.input-attr').each(function(index, elem) {
            if (elem.checked) {
                attrs[elem.id] = true
            }
        })
        if (gvnb.isBoardFeatureEnabled('captcha')) {
            attrs.captcha = {
                    "Id": localStorage["captcha_id"],
                    "Solution": document.getElementById("input_captcha").value
            };
        };

        if (this.baseCont.state.ctx == ViewContext.BOARD) {
            this.msgr.createThread(this.state.board, topic, contents, attrs);
        }
        else if (this.baseCont.state.ctx == ViewContext.THREAD) {
            this.msgr.addPost(this.state.board, topic, contents, this.state.thread, attrs);
        }
    }

    this.attemptPosting = function(evt) {
        var fileList = document.getElementById("input_file").files;
        if (fileList.length > 0) {
            this.msgr.uploadFiles(_.toArray(fileList));
        } else {
            this.sendPostingForm(null);
        }
        evt.preventDefault();
    }

    this.sendLoginForm = function(evt) {
        gvnb.msgr.attemptLogin($("#input_login_key")[0].value);
        evt.preventDefault();
    }

    this.onLoginSuccessfulMessage = function(msg) {
        document.cookie = "userid=" + msg.Cookie + "; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
        location.reload();
    }

    this.onFilesUploadSuccess = function(files) {
        var filesObj = {videos: [], images: []};
        _.each(files, function(filename) {
            var extension = filename.split('.').pop();
            if (extension == 'webm')
                filesObj.videos.push(filename)
            else
                filesObj.images.push(filename);
        });
        this.sendPostingForm(filesObj);
    }
}


document.addEventListener("DOMContentLoaded", function () {
    gvnb = new Govnaba();
});
