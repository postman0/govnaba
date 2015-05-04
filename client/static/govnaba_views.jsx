
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
            { this.state.ctx == ViewContext.BOARD ? <PostingForm type="board"/> : null}
            {threads}
            {posts}
            { this.state.ctx == ViewContext.THREAD ? <PostingForm type="thread"/> : null}
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
		var imgs = null;
		attrs = this.props.postData.Attrs;
		if (attrs && attrs.images) {
			imgs = (
				<div className="post-images">
				{attrs.images.map(function(imgName){
					return (
						<a href={"/static/uploads/"+imgName} target="_blank">
							<img className="post-image img-thumbnail pull-left" src={"/static/uploads/thumb"+imgName}></img>
						</a>
					)
				})}
				</div>
			);
		}
		var topic = null;
		if (this.props.postData.Topic) {
			topic = <span className="post-header-topic">{this.props.postData.Topic}</span>
		}

		function processMarkup(str) {
			var tagsToReplace = {
			    '&': '&amp;',
			    '<': '&lt;',
			    '>': '&gt;'
			};

			function replaceTag(tag) {
			    return tagsToReplace[tag] || tag;
			}

			function safeTagsReplace(str) {
			    return str.replace(/[&<>]/g, replaceTag);
			}

			var boldCount = 0, italicCount = 0;
			var iBold = 0, iItalic = 0;
			var text = safeTagsReplace(str);
			text = text.replace(/\n/, "<br>");
			text = text.replace(/\*\*/g, function() {
				boldCount++;
				var rplcmnt;
				if (iBold % 2 == 0)
					rplcmnt = '<span class="post-body-bold">'
				else
					rplcmnt = '</span>';

				iBold++;
				return rplcmnt;
			});
			text = text.replace(/\*/g, function() {
				italicCount++;
				var rplcmnt;
				if (iItalic % 2 == 0)
					rplcmnt = '<span class="post-body-italic">'
				else
					rplcmnt = '</span>';
				iItalic++;
				return rplcmnt;
			});
			if (boldCount % 2 == 1)
				text += '</span>';
			if (italicCount % 2 == 1)
				text += '</span>';
			return {__html: text};
		}


		return (
			<div className="panel panel-default post-container">
				<div className="panel-heading">
				<a href={gvnb.getThreadLink(this.props.opPostId, this.props.postData.LocalId)} className="post-header-id">#{this.props.postData.LocalId}</a>
				{topic}
				<span className="post-header-date">{datestr}</span>
				</div>
				<div className="panel-body">
					{imgs}
					<div className="post-body" 
						dangerouslySetInnerHTML={processMarkup(this.props.postData.Contents)}></div>
				</div>
			</div>
		)
	}
})

var PostingForm = React.createClass({
	render: function() {
		var submitCaption;
		switch (this.props.type) {
			case "thread": submitCaption = "Ответить"; break;
			case "board":  submitCaption = "Создать тред"; break;
		};
		return (
			<div className="panel panel-default postform">
			<form className="form-horizontal panel-body" action="" role="form" onSubmit={gvnb.sendPostingForm.bind(gvnb)}>
				<div className="form-group">
					<label className="control-label col-sm-2">Тема</label>
					<div className="col-sm-10">
						<input id="input_topic" name="topic" type="text" className="form-control"/>
					</div>
				</div>
				<div className="form-group">
					<label className="control-label col-sm-2">Текст</label>
					<div className="col-sm-10">
						<textarea id="input_contents" name="contents" className="form-control" required>
						</textarea>
					</div>
				</div>
				<div className="form-group">
					<label className="control-label col-sm-2">Файл</label>
					<div className="col-sm-10">
						<input id="input_file" name="file" type="file"/>
					</div>
				</div>
				<div className="form-group">
					<div className="col-sm-2 col-sm-offset-2">
						<input type="submit" className="form-control" value={submitCaption} />
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
