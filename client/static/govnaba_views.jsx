
var MainPage = React.createClass({
	render: function() {
		var boards = this.props.boards.map(function(board) {
			return (
				<li><a href={"/"+board+"/"}>/{board}/</a></li>
			);
		});
		return (
			<ul>
				{boards}
			</ul>
		)
	}
})

var Board = React.createClass({
	render: function() {
		return (
			<div className="board">
				{this.props.threads.map(function(val) {
					return (
						<Thread posts={val} />
					)
				})}
			</div>
		)
	}
})

var Thread = React.createClass({
	render: function() {
		return (
			<div className="thread">
				{this.props.posts.map(function(val) {
					return (
						<Post postData={val} />
					)
				})}
			</div>
		)
	}
})

var Post = React.createClass({
	render: function() {
		return (
			<div className="post">
				<div className="post-header">
				<span className="post-header-id">{this.props.postData.LocalId}</span>
				<span className="post-header-date">{new Date(this.props.postData.Date).toLocaleString()}</span>
				</div>
				<div className="post-contents">
					{this.props.postData.Contents}
				</div>
			</div>
		)
	}
})


var GovnabaViews = function() {
	this.index = function(boards) {
		React.render(<MainPage boards={boards} />, document.getElementsByTagName('body')[0]);
	}

	this.showBoardPage = function(msg) {
		React.render(<Board threads={msg.Threads} />, document.getElementsByTagName('body')[0]);
	}

}
