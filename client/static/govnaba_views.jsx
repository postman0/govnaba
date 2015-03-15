
var Base = React.createClass({
	render: function() {
		return (
		<div id="content-main" className="container-fluid">
			<NavBar />
            <div id="board-list" className="col-md-2">
            </div>
            <div id="content-board" className="col-md-8">
            </div>
        </div>
		);
	}
})

var NavBar = React.createClass({
	render: function() {
		return (
			<nav className="navbar navbar-default navbar-static-top">
				<div className="navbar-header">
					<a className="navbar-brand" href="/">Govnaba</a>
				</div>
			</nav>
		)
	}
})


var BoardList = React.createClass({
	render: function() {
		var boards = this.props.boards.map(function(board) {
			return (
				<li className="list-group-item"><a href={"/"+board+"/"}>/{board}/</a></li>
			);
		});
		return (
			<ul className="list-group">
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
			<div className="panel panel-default">
				<div className="panel-body">
				{this.props.posts.map(function(val) {
					return (
						<Post postData={val} />
					)
				})}
				</div>
			</div>
		)
	}
})

var Post = React.createClass({
	render: function() {
		return (
			<div className="panel panel-default">
				<div className="panel-heading">
				<span className="post-header-id">{this.props.postData.LocalId} </span>
				<span className="post-header-date">
					{new Date(this.props.postData.Date).toLocaleString({}, {
						hour12: false,
						weekday: "narrow",
						year: "numeric",
						month: "long",
						day: "numeric"
					})}
				</span>
				</div>
				<div className="panel-body">
					{this.props.postData.Contents}
				</div>
			</div>
		)
	}
})


var GovnabaViews = function() {
	this.showBoardList = function(boards) {
		React.render(<BoardList boards={boards} />, document.getElementById("board-list"));
	}

	this.showBoardPage = function(msg) {
		React.render(<Board threads={msg.Threads} />, document.getElementById("content-board"));
	}

	this.showBase = function() {
		React.render(<Base />, document.getElementsByTagName("body")[0]);
	}
}
