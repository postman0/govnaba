
var Base = React.createClass({displayName: "Base",
	render: function() {
		return (
		React.createElement("div", {id: "content-main", className: "container-fluid"}, 
			React.createElement(NavBar, null), 
            React.createElement("div", {id: "board-list", className: "col-md-2"}
            ), 
            React.createElement("div", {id: "content-board", className: "col-md-8"}
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


var GovnabaViews = function() {
	this.showBoardList = function(boards) {
		React.render(React.createElement(BoardList, {boards: boards}), document.getElementById("board-list"));
	}

	this.showBoardPage = function(msg) {
		React.render(React.createElement(Board, {threads: msg.Threads}), document.getElementById("content-board"));
	}

	this.showBase = function() {
		React.render(React.createElement(Base, null), document.getElementsByTagName("body")[0]);
	}
	this.showThread = function(posts) {
		React.render(React.createElement(Thread, {posts: posts}), document.getElementById("content-board"));
	}
}
