
var MainPage = React.createClass({displayName: "MainPage",
	render: function() {
		var boards = this.props.boards.map(function(board) {
			return (
				React.createElement("li", {className: "list-group-item"}, React.createElement("a", {href: "/"+board+"/"}, "/", board, "/"))
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
						React.createElement(Thread, {posts: val})
					)
				})
			)
		)
	}
})

var Thread = React.createClass({displayName: "Thread",
	render: function() {
		return (
			React.createElement("div", {className: "panel panel-default"}, 
				React.createElement("div", {className: "panel-body"}, 
				this.props.posts.map(function(val) {
					return (
						React.createElement(Post, {postData: val})
					)
				})
				)
			)
		)
	}
})

var Post = React.createClass({displayName: "Post",
	render: function() {
		return (
			React.createElement("div", {className: "panel panel-default"}, 
				React.createElement("div", {className: "panel-heading"}, 
				React.createElement("span", {className: "post-header-id"}, this.props.postData.LocalId, " "), 
				React.createElement("span", {className: "post-header-date"}, 
					new Date(this.props.postData.Date).toLocaleString({}, {
						hour12: false,
						weekday: "narrow",
						year: "numeric",
						month: "long",
						day: "numeric"
					})
				)
				), 
				React.createElement("div", {className: "panel-body"}, 
					this.props.postData.Contents
				)
			)
		)
	}
})


var GovnabaViews = function() {
	this.index = function(boards) {
		React.render(React.createElement(MainPage, {boards: boards}), document.getElementById("board-list"));
	}

	this.showBoardPage = function(msg) {
		React.render(React.createElement(Board, {threads: msg.Threads}), document.getElementById("content-board"));
	}

}
