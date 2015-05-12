
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
		this.setState({ctx: ViewContext.MAINPAGE, boards: boardList, curBoard: null, curThread: null});
	},
	displayBoard: function(boardMsg) {
		this.setState({ctx: ViewContext.BOARD, threads: boardMsg.Threads, 
			curBoard: boardMsg.Board, curThread: null});
	},
	displayThread: function(posts) {
		this.setState({ctx: ViewContext.THREAD, posts: posts, curThread: posts[0].LocalId});
	},
	displayNewPost: function(post) {
		posts = this.state.posts;
		posts.push(post);
		this.setState({posts: posts});
	},
	displayNewThread: function(thread) {
		threads = this.state.threads;
		threads.unshift(thread);
		this.setState({threads: threads});
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
			<div className="row">
				<NavBreadCrumbs thread={this.state.curThread} board={this.state.curBoard} />
			</div>
			<div className="row">
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
				<div className="collapse navbar-collapse">
					<div className="navbar-form navbar-right">
						<form className="form-inline" action="#" onSubmit={gvnb.sendLoginForm.bind(gvnb)}>
							<input id="input_login_key" type="text" className="form-control" placeholder="Ключ"></input>
							<input id="input_login_submit" type="submit" className="form-control" value="Вход"></input>
						</form>
					</div>
				</div>
			</nav>
		)
	}
})

var NavBreadCrumbs = React.createClass({
	render: function() {
		var board = null;
		if(this.props.board)
			board = <li><a href={"/"+this.props.board+"/"}>{"/"+this.props.board+"/"}</a></li>
		var thread = null;
		if(this.props.thread)
			thread = <li><a href={"/"+this.props.board+"/"+this.props.thread}>{"Тред #"+this.props.thread}</a></li>
		return (
			<div className="col-md-12">
				<ol className="breadcrumb breadcrumb-navbar">
					<li><a href="/">Главная</a></li>
					{board}
					{thread}
				</ol>
			</div>
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
				<nav>
					<ul className="pager">
						<li><a href={"/" + gvnb.state.board + "?page=" + (gvnb.state.page-1)}>Назад</a></li>
						<li><a href={"/" + gvnb.state.board + "?page=" + (gvnb.state.page+1)}>Вперед</a></li>
					</ul>
				</nav>
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
	},
	componentDidMount: function() {
		gvnb.performScroll();
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
							<img className="post-image img-thumbnail pull-left" src={"/static/uploads/thumb"+imgName}
							 alt={imgName}></img>
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
			    return str.replace(/[&<>'"]/g, replaceTag);
			}

			function replaceMarkupTags(str, regex, className) {
				var tagCount = 0;
				var text = str.replace(regex, function() {
					var rplcmnt;
					if (tagCount % 2 == 0)
						rplcmnt = '<span class="'+ className + '">'
					else
						rplcmnt = '</span>';
					tagCount++;
					return rplcmnt;
				});
				if (tagCount % 2 == 1)
					text += '</span>';
				return text;
			}

			var text = safeTagsReplace(str);
			text = text.replace(/^&gt;(.*$\n)/mg, function(match, contents){
				return '<blockquote class="post-body-quote">' + safeTagsReplace(contents) + '</blockquote>';
			});
			text = text.replace(/\n/, " <br>");
			text = replaceMarkupTags(text, /\*\*/g, "post-body-bold");
			text = replaceMarkupTags(text, /\*/g, "post-body-italic");
			text = replaceMarkupTags(text, /%%/g, "post-body-spoiler");
			text = replaceMarkupTags(text, /__/g, "post-body-underline");

			text = text.replace(/\w(?:\w|\.|\-)*\:\S+/g, function(match) {
				return '<a target="_blank" href="' + safeTagsReplace(match).replace(/"/g, "&quot;") + '">' + 
					safeTagsReplace(match) + 
				'</a>';
			});

			return {__html: text};
		}


		return (
			<div id={"post-" + this.props.postData.LocalId} className="panel panel-default post-container">
				<div className="panel-heading">
				<a 
					href={gvnb.getThreadLink(this.props.opPostId, this.props.postData.LocalId)} 
					className="post-header-id">#{this.props.postData.LocalId}</a>
				{topic}
				{ (attrs && attrs.sage) ? <span className='label label-sage'>SAGE</span> : null}
				{ (attrs && attrs.op) ? <span className='label label-primary'>OP</span> : null}
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
			<form className="form-horizontal panel-body" action="#" role="form" onSubmit={gvnb.sendPostingForm.bind(gvnb)}>
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
						<input id="input_sage" type="checkbox" name="sage" className="checkbox-inline" value="">
							SAGE
						</input>
						<input id="input_op" type="checkbox" name="op" className="checkbox-inline" value="">
							OP
						</input>
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
