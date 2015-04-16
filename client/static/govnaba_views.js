
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
		console.log(boardMsg);
		this.setState({ctx: ViewContext.BOARD, threads: boardMsg.Threads});
	},
	displayThread: function(posts) {
		this.setState({ctx: ViewContext.THREAD, posts: posts});
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
             this.state.ctx == ViewContext.BOARD ? React.createElement(PostingForm, null) : null, 
            threads, 
            posts, 
             this.state.ctx == ViewContext.THREAD ? React.createElement(PostingForm, null) : null
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
		return (
			React.createElement("div", {className: "panel panel-default post-container"}, 
				React.createElement("div", {className: "panel-heading"}, 
				React.createElement("a", {href: gvnb.getThreadLink(this.props.opPostId, this.props.postData.LocalId), className: "post-header-id"}, "#", this.props.postData.LocalId), 
				React.createElement("span", {className: "post-header-date"}, datestr)
				), 
				React.createElement("div", {className: "panel-body"}, 
					this.props.postData.Contents
				)
			)
		)
	}
})

var PostingForm = React.createClass({displayName: "PostingForm",
	render: function() {
		return (
			React.createElement("div", {className: "panel panel-default postform"}, 
			React.createElement("form", {className: "form-horizontal", action: "", role: "form"}, 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("label", {className: "control-label col-sm-2"}, "Тема"), 
					React.createElement("div", {className: "col-sm-10"}, 
						React.createElement("input", {name: "topic", type: "text", className: "form-control"})
					)
				), 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("label", {className: "control-label col-sm-2"}, "Текст"), 
					React.createElement("div", {className: "col-sm-10"}, 
						React.createElement("textarea", {name: "contents", className: "form-control"}
						)
					)
				), 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("div", {className: "col-sm-2"}, 
							React.createElement("input", {type: "submit", className: "form-control"})
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
