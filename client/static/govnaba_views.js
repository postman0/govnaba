
var MainPage = React.createClass({displayName: "MainPage",
	render: function() {
		var boards = this.props.boards.map(function(board) {
			return (
				React.createElement("li", null, React.createElement("a", {href: "/"+board+"/"}, "/", board, "/"))
			);
		});
		return (
			React.createElement("ul", null, 
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
			React.createElement("div", {className: "thread"}, 
				this.props.posts.map(function(val) {
					return (
						React.createElement(Post, {postData: val})
					)
				})
			)
		)
	}
})

var Post = React.createClass({displayName: "Post",
	render: function() {
		return (
			React.createElement("div", {className: "post"}, 
				React.createElement("div", {className: "post-header"}, 
				React.createElement("span", {className: "post-header-id"}, this.props.postData.LocalId), 
				React.createElement("span", {className: "post-header-date"}, new Date(this.props.postData.Date).toLocaleString())
				), 
				React.createElement("div", {className: "post-contents"}, 
					this.props.postData.Contents
				)
			)
		)
	}
})


var GovnabaViews = function() {
	this.index = function(boards) {
		React.render(React.createElement(MainPage, {boards: boards}), document.getElementsByTagName('body')[0]);
	}

	this.showBoardPage = function(msg) {
		React.render(React.createElement(Board, {threads: msg.Threads}), document.getElementsByTagName('body')[0]);
	}

}
