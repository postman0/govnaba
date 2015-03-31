
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
				<li className="list-group-item" key={board}><a href={"/"+board+"/"}>/{board}/</a></li>
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
						<Thread posts={val} key={val[0].LocalId}/>
					)
				})}
			</div>
		)
	}
})

var Thread = React.createClass({
	render: function() {
		var opId = this.props.posts[0].LocalId;
		return (
			<div className="thread-container">
				{this.props.posts.map(function(val) {
					return (
						<Post postData={val} opPostId={opId} key={val.LocalId}/>
					)
				})}
			</div>
		)
	}
})

var Post = React.createClass({
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
			<div className="panel panel-default post-container">
				<div className="panel-heading">
				<a href={gvnb.getThreadLink(this.props.opPostId, this.props.postData.LocalId)} className="post-header-id">#{this.props.postData.LocalId}</a>
				<span className="post-header-date">{datestr}</span>
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
	this.showThread = function(posts) {
		React.render(<Thread posts={posts} />, document.getElementById("content-board"));
	}
}
