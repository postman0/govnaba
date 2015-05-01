
ViewContext = {
	NONE: 0,
	MAINPAGE: 1,
	BOARD: 2,
	THREAD: 3
}

var Base = React.createClass({displayName: "Base",

	getInitialState: function() {
		return {ctx: ViewContext.NONE}
	},
	displayMainPage: function(boardList) {
		this.setState({ctx: ViewContext.MAINPAGE, boards: boardList});
	},
	displayBoard: function(boardMsg) {
		this.setState({ctx: ViewContext.BOARD, threads: boardMsg.Threads});
	},
	displayThread: function(posts) {
		this.setState({ctx: ViewContext.THREAD, posts: posts});
	},
	displayNewPost: function(post) {
		posts = this.state.posts;
		posts.push(post);
		this.setState({posts: posts});
	},
	render: function() {
		var boardList, threads, posts;
		if (this.state.ctx == ViewContext.MAINPAGE) {
			boardList = React.createElement(BoardList, {boards: this.state.boards});
		}
		if (this.state.ctx == ViewContext.BOARD) {
			threads = React.createElement(Board, {threads: this.state.threads});
		}
		if (this.state.ctx == ViewContext.THREAD) {
			posts = React.createElement(Thread, {posts: this.state.posts});
		}
		return (
		React.createElement("div", {id: "content-main", className: "container-fluid"}, 
			React.createElement(NavBar, null), 
            React.createElement("div", {id: "board-list", className: "col-md-2"}, 
            boardList
            ), 
            React.createElement("div", {id: "content-board", className: "col-md-8"}, 
             this.state.ctx == ViewContext.BOARD ? React.createElement(PostingForm, {type: "board"}) : null, 
            threads, 
            posts, 
             this.state.ctx == ViewContext.THREAD ? React.createElement(PostingForm, {type: "thread"}) : null
            )
        )
		);
	}
})

var NavBar = React.createClass({displayName: "NavBar",
	render: function() {
		return (
			React.createElement("nav", {className: "navbar navbar-default navbar-static-top"}, 
				React.createElement("div", {className: "navbar-header"}, 
					React.createElement("a", {className: "navbar-brand", href: "/"}, "Govnaba")
				)
			)
		)
	}
})


var BoardList = React.createClass({displayName: "BoardList",
	render: function() {
		var boards = this.props.boards.map(function(board) {
			return (
				React.createElement("li", {className: "list-group-item", key: board}, React.createElement("a", {href: "/"+board+"/"}, "/", board, "/"))
			);
		});
		return (
			React.createElement("ul", {className: "list-group"}, 
				boards
			)
		)
	}
})

var Board = React.createClass({displayName: "Board",
	render: function() {
		return (
			React.createElement("div", {className: "board"}, 
				this.props.threads.map(function(val) {
					return (
						React.createElement(Thread, {posts: val, key: val[0].LocalId})
					)
				})
			)
		)
	}
})

var Thread = React.createClass({displayName: "Thread",
	render: function() {
		var opId = this.props.posts[0].LocalId;
		return (
			React.createElement("div", {className: "thread-container"}, 
				this.props.posts.map(function(val) {
					return (
						React.createElement(Post, {postData: val, opPostId: opId, key: val.LocalId})
					)
				})
			)
		)
	}
})

var Post = React.createClass({displayName: "Post",
	render: function() {
		var datestr = new Date(this.props.postData.Date).toLocaleString({}, {
			hour12: false,
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric"});
		datestr = datestr.charAt(0).toUpperCase() + datestr.slice(1);
		var imgs = null;
		attrs = this.props.postData.Attrs;
		if (attrs && attrs.images) {
			imgs = (
				React.createElement("div", {className: "post-images"}, 
				attrs.images.map(function(imgName){
					return (
						React.createElement("a", {href: "/static/uploads/"+imgName, target: "_blank"}, 
							React.createElement("img", {className: "post-image img-thumbnail pull-left", src: "/static/uploads/thumb"+imgName})
						)
					)
				})
				)
			);
			console.log(imgs);
		}
		return (
			React.createElement("div", {className: "panel panel-default post-container"}, 
				React.createElement("div", {className: "panel-heading"}, 
				React.createElement("a", {href: gvnb.getThreadLink(this.props.opPostId, this.props.postData.LocalId), className: "post-header-id"}, "#", this.props.postData.LocalId), 
				React.createElement("span", {className: "post-header-date"}, datestr)
				), 
				React.createElement("div", {className: "panel-body"}, 
					imgs, 
					this.props.postData.Contents
				)
			)
		)
	}
})

var PostingForm = React.createClass({displayName: "PostingForm",
	render: function() {
		var submitCaption;
		switch (this.props.type) {
			case "thread": submitCaption = "Ответить"; break;
			case "board":  submitCaption = "Создать тред"; break;
		};
		return (
			React.createElement("div", {className: "panel panel-default postform"}, 
			React.createElement("form", {className: "form-horizontal panel-body", action: "", role: "form", onSubmit: gvnb.sendPostingForm.bind(gvnb)}, 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("label", {className: "control-label col-sm-2"}, "Тема"), 
					React.createElement("div", {className: "col-sm-10"}, 
						React.createElement("input", {id: "input_topic", name: "topic", type: "text", className: "form-control"})
					)
				), 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("label", {className: "control-label col-sm-2"}, "Текст"), 
					React.createElement("div", {className: "col-sm-10"}, 
						React.createElement("textarea", {id: "input_contents", name: "contents", className: "form-control", required: true}
						)
					)
				), 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("label", {className: "control-label col-sm-2"}, "Файл"), 
					React.createElement("div", {className: "col-sm-10"}, 
						React.createElement("input", {id: "input_file", name: "file", type: "file"})
					)
				), 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("div", {className: "col-sm-2 col-sm-offset-2"}, 
							React.createElement("input", {type: "submit", className: "form-control", value: submitCaption})
					)
				)
			)
			)
		);
	}
})


var GovnabaViews = {
	mountBaseContainer: function() {
		return React.render(React.createElement(Base, null), document.getElementsByTagName("body")[0]);
	}
}
