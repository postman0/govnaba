
ViewContext = {
	NONE: 0,
	MAINPAGE: 1,
	BOARD: 2,
	THREAD: 3
}

var Base = React.createClass({

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
			boardList = <BoardList boards={this.state.boards} />;
		}
		if (this.state.ctx == ViewContext.BOARD) {
			threads = <Board threads={this.state.threads} />;
		}
		if (this.state.ctx == ViewContext.THREAD) {
			posts = <Thread posts={this.state.posts} />;
		}
		return (
		<div id="content-main" className="container-fluid">
			<NavBar />
            <div id="board-list" className="col-md-2">
            {boardList}
            </div>
            <div id="content-board" className="col-md-8">
            { this.state.ctx == ViewContext.BOARD ? <PostingForm /> : null}
            {threads}
            {posts}
            { this.state.ctx == ViewContext.THREAD ? <PostingForm /> : null}
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

var PostingForm = React.createClass({
	render: function() {
		return (
			<div className="panel panel-default postform">
			<form className="form-horizontal" action="" role="form">
				<div className="form-group">
					<label className="control-label col-sm-2">Тема</label>
					<div className="col-sm-10">
						<input name="topic" type="text" className="form-control" />
					</div>
				</div>
				<div className="form-group">
					<label className="control-label col-sm-2">Текст</label>
					<div className="col-sm-10">
						<textarea name="contents" className="form-control">
						</textarea>
					</div>
				</div>
				<div className="form-group">
					<div className="col-sm-2">
							<input type="submit" className="form-control" />
					</div>
				</div>
			</form>
			</div>
		);
	}
})


var GovnabaViews = {
	mountBaseContainer: function() {
		return React.render(<Base />, document.getElementsByTagName("body")[0]);
	}
}
