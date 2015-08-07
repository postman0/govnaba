
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
		this.setState({ctx: ViewContext.MAINPAGE, 
			boards: boardList, threads: null, posts: null, 
			curBoard: null, curThread: null});
		this.setPageTitle(gvnb.config.SiteName);
	},
	displayBoard: function(boardMsg) {
		this.setState({ctx: ViewContext.BOARD, threads: boardMsg.Threads, 
			curBoard: boardMsg.Board, curThread: null});
		this.setPageTitle('/' + boardMsg.Board + '/ — ' + gvnb.config.SiteName);
	},
	displayThread: function(postsMsg) {
		var threadId = postsMsg.Posts[0].LocalId;
		this.setState({ctx: ViewContext.THREAD, posts: postsMsg.Posts,
			curBoard: postsMsg.Board, curThread: threadId});
		var threadTopic = postsMsg.Posts[0].Topic;
		if (threadTopic != '')
			this.setPageTitle(threadTopic + ' — ' + gvnb.config.SiteName)
		else
			this.setPageTitle(_.template("/<%= board %>/ #<%= tid %> — <%= site %>")({
				board: postsMsg.Board,
				tid: threadId,
				site: gvnb.config.SiteName
			}))
	},
	displayNewPost: function(post) {
		if (this.state.ctx == ViewContext.THREAD) {
			var posts = this.state.posts;
			posts.push(post);
			this.setState({posts: posts});
		} else if (this.state.ctx == ViewContext.BOARD) {
			var threads = this.state.threads;
			var updatedThread = _.find(threads, function(t){
				return t[0].LocalId == post.ThreadId; 
			});
			if (updatedThread) {
				updatedThread.push(post);
				this.setState({threads: threads});
			}
		}
	},
	displayNewThread: function(thread) {
		threads = this.state.threads;
		threads.unshift(thread);
		this.setState({threads: threads});
	},
	displayUserCount: function(count) {
		this.setState({users: count});
	},
	displayCaptcha: function(base64img) {
		this.setState({captcha: base64img});
	},
	displayPreview: function(postId, x, y, postData) {
		var pData;
		if (postData)
			pData = postData
		else
			pData = _.findWhere(this.state.posts, {LocalId: postId});
		this.refs.previews.displayPreview({
			postData: pData,
			ThreadId: this.state.curThread,
			x: x, y: y});
	},
	setPageTitle: function(title) {
		document.title = title;
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
			<NavBar users={this.state.users}/>
			<div className="row">
				<NavBreadCrumbs thread={this.state.curThread} board={this.state.curBoard} />
			</div>
			<div className="row">
	            <div id="board-list" className="col-md-2">
	            	{boardList}
	            </div>
	            <div id="content-board" className="col-md-8">
	            	{ this.state.ctx == ViewContext.MAINPAGE ?
	            		<div dangerouslySetInnerHTML={{__html: gvnb.config.MainPageContent}}>
	            		</div>
	            		: null
	            	}
		            { this.state.ctx == ViewContext.BOARD ? 
		            	<PostingForm type="board" captcha={this.state.captcha}/> 
		            	: null}
		            {threads}
		            {posts}
		            { this.state.ctx == ViewContext.THREAD ? 
		            	<PostingForm type="thread" captcha={this.state.captcha}/> 
		            	: null}
            	</div>
        	</div>
        	<PostPreviews ref="previews" />
        </div>
		);
	}
})

var NavBar = React.createClass({
	render: function() {
		return (
			<nav className="navbar navbar-default navbar-static-top">
				<div className="navbar-header">
					<a className="navbar-brand" href="/">{gvnb.config.SiteName}</a>
				</div>
				{ this.props.users ? 
					<div className="navbar-users navbar-text">
						<span className="glyphicon glyphicon-user icon-usercount"></span>
						{this.props.users}
					</div> 
					: null
				}
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

var ytTpl = _.template(
	'<iframe class="post-embed" src="https://www.youtube.com/embed/<%- id %>" type="text/html" ' +
	' width="480" height="270"></iframe>'
	);
var coubTpl = _.template(
	'<iframe class="post-embed" src="https://coub.com/embed/<%- id %>" type="text/html" ' +
	' width="480" height="270"></iframe>'
	);
var vimeoTpl = _.template(
	'<iframe class="post-embed" src="https://player.vimeo.com/video/<%- id %>" type="text/html" ' +
	' width="480" height="270"></iframe>'
	);

var Post = React.createClass({
	processMarkup: function(str) {
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

		var opPostId = this.props.opPostId;
		var attrs = this.props.postData.Attrs;
		text = text.replace(/&gt;&gt;(\d+)/g, function(match, id) {
			if (attrs && attrs.refs && attrs.refs[id]) {
				return '<a href="' + gvnb.getThreadLink(attrs.refs[id], id) + 
					'" class="post-reference" ' + 
					'data-thread-id="'+ attrs.refs[id] + '" ' + 
					'data-post-id="'+ id + '" ' + 
					'>' + match + '</a>';
			} else {
				return match
			}
		});
		text = text.replace(/^&gt;(.*$\n)/mg, function(match, contents){
			return '<blockquote class="post-body-quote">' + safeTagsReplace(contents) + '</blockquote>';
		});
		text = text.replace(/\n/, " <br>");
		text = replaceMarkupTags(text, /\*\*/g, "post-body-bold");
		text = replaceMarkupTags(text, /\*/g, "post-body-italic");
		text = replaceMarkupTags(text, /%%/g, "post-body-spoiler");
		text = replaceMarkupTags(text, /__/g, "post-body-underline");

		var embedHandlers = {
			youtube: function(link) {
				var match = link.match(/https?\:\/\/(?:www\.)?youtube\.com\/.*v\=([^&]+)/i);
				if (match) {
					return ytTpl({id: match[1]});
				}
			},
			coub: function(link) {
				var match = link.match(/https?\:\/\/(?:www\.)?coub\.com\/view\/([^?]+)/i);
				if (match) {
					return coubTpl({id: match[1]});
				}
			},
			vimeo: function(link) {
				var match = link.match(/https?\:\/\/(?:www\.)?vimeo\.com\/([^?]+)/i);
				if (match) {
					return vimeoTpl({id: match[1]});
				}
			}
		};

		text = text.replace(/\w(?:\w|\.|\-)*\:\S+/g, function(match) {
			var result;
			_.values(embedHandlers).map(function(handler) {
				if (!result) {
					result = handler(match);
				}
			});
			if (!result) {
				return '<a target="_blank" href="' + safeTagsReplace(match).replace(/"/g, "&quot;") + '">' + 
					safeTagsReplace(match) + 
				'</a>';
			}
			else
				return result;
		});

		return {__html: text};
	},

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
		attrs = this.props.postData.Attrs;
		var imgs = null;
		if (attrs && attrs.images) {
			imgs = attrs.images.map(function(imgName){
					return (
						<a href={"/static/uploads/"+imgName} target="_blank" key={imgName} >
							<img className="post-image img-thumbnail" src={"/static/uploads/thumb"+imgName}
							 alt={imgName} onClick={gvnb.expandImage}></img>
						</a>
					)
				});
		};
		var videos = null;
		if (attrs && attrs.videos) {
			videos = attrs.videos.map(function(vidName){
				return (<PostVideo videoName={vidName} key={vidName} />);
			});
		}
		var files = null;
		if ((imgs || videos) && !attrs.deleted) {
			var length = 0;
			if (imgs)
				length += imgs.length;
			if (videos)
				length += videos.length;
			files = (
				<div className={"post-files " + (length > 1 ? "post-files-many" : "pull-left")}>
					{imgs}
					{videos}
				</div>)
		}
		var topic = null;
		if (this.props.postData.Topic) {
			topic = <span className="post-header-topic">{this.props.postData.Topic}</span>
		}

		var locked = null, pinned = null;
		if (this.props.postData.LocalId == this.props.opPostId) {
			if (this.props.postData.IsLocked) {
				locked = <span className="post-thread-attrs glyphicon glyphicon-lock"></span>
			};
			if (this.props.postData.IsPinned) {
				pinned = <span className="post-thread-attrs glyphicon glyphicon-pushpin"></span>
			};
		}

		var argBoard = gvnb.state.board;
		var argId = this.props.postData.LocalId;

		var deleteButton = null;
		if (attrs && attrs.own || gvnb.hasModRights()) {
			deleteButton = <a className="post-delete-button" href='#' title="Удалить пост"
				onClick={function(evt){gvnb.deletePost(argBoard, argId);
					evt.preventDefault();}} >
				<span className="glyphicon glyphicon-remove"></span>
			</a> 
		};

		var self = this;
		var lockButton = null, pinButton = null;
		if (gvnb.hasModRights() && this.props.postData.LocalId == this.props.opPostId) {
			lockButton = <a className="post-lock-button" href='#' title="Закрыть тред"
				onClick={function(evt){gvnb.lockThread(argBoard, argId, !self.props.postData.IsLocked);
					evt.preventDefault();}} >
				<span className="glyphicon glyphicon-lock"></span>
			</a>;
			pinButton = <a className="post-pin-button" href='#' title="Закрепить тред"
				onClick={function(evt){gvnb.pinThread(argBoard, argId, !self.props.postData.IsPinned);
					evt.preventDefault();}} >
				<span className="glyphicon glyphicon-pushpin"></span>
			</a>;
		}

		var answers = null;
		if (attrs && attrs.answers) {
			answers = <div className="post-answers">
			Ответы: 
			{
				Object.keys(attrs.answers).map(function(answ){
					return (
						<a className="post-answer post-reference" href={gvnb.getThreadLink(attrs.answers[answ], answ)}
							data-thread-id={attrs.answers[answ]} data-post-id={answ} key={answ}>
						#{answ}
						</a>)
				})
			}
			</div>
		}

		var country = null;
		if (gvnb.isBoardFeatureEnabled('country') && attrs && attrs.country) {
			country = <img className="post-header-country" src={"/static/flags/" + attrs.country + '.png'} alt={attrs.country}></img>
		}

		var ipIdent = null;
		if (gvnb.isBoardFeatureEnabled('ipident') && attrs && attrs.ipIdent) {
			var elems = [];
			for (var i = 0; i < 8; i++) {
				var colours = attrs.ipIdent.slice(i*4, i*4+4);
				var colourValue = {"background-color": "rgb(" + colours[0] +"," + colours[1] +"," + colours[2] +");"};
				elems.push(<span className="post-ip-ident-elem" style={colourValue}>
					{colours[3]}
					</span>);
			}
			ipIdent = <span className="post-ip-ident">{elems}</span>;
		}

		var bodyContent = null;
		if (attrs && attrs.deleted) {
			bodyContent = <span className="post-deleted-body">Пост удален.</span>
		} else if (attrs && attrs.deletedMod) {
			bodyContent = <span className="post-deleted-body">Пост удален модератором.</span>
		} else {
			bodyContent = <div className="post-body" 
				dangerouslySetInnerHTML={this.processMarkup(this.props.postData.Contents)}>
			</div>
		};

		return (
			<div id={"post-" + this.props.postData.LocalId}
				className={"panel panel-default post-container " + 
					((attrs && (attrs.deleted || attrs.deletedMod)) ? "post-deleted" : "")} >
				<div className="panel-heading">
				<a 
					href={gvnb.getThreadLink(this.props.opPostId, this.props.postData.LocalId)} 
					className="post-header-id">#{this.props.postData.LocalId}</a>
				{pinned}
				{locked}
				{topic}
				{ipIdent}
				{ country }
				{ (attrs && attrs.sage) ? <span className='label label-sage'>SAGE</span> : null}
				{ (attrs && attrs.op) ? <span className='label label-primary'>OP</span> : null}
				<span className="post-header-date">{datestr}</span>
				</div>
				<div className="panel-body">
					{files}
					{bodyContent}
					{answers}
					<span className="post-actions">
						{pinButton}{lockButton}{deleteButton}
					</span>
				</div>
			</div>
		)
	},

	componentDidMount: function() {
		$(this.getDOMNode()).find('.post-reference').mouseover(gvnb.showPostPreview.bind(gvnb));
	}
});

var PostPreviews = React.createClass({
	getInitialState: function() {
		return {posts: []};
	},
	displayPreview: function(post) {
		var posts = this.state.posts;
		posts.push(post);
		this.setState({posts: posts});
	},
	removePostPreview: function(evt) {
		this.setState({
			posts: _.reject(this.state.posts, 
				function(p) { return (p.postData.LocalId == evt.currentTarget.dataset.postId) })
		});
	},
	render: function() {
		var mouseOutHandler = this.removePostPreview;
		return (
			<div className="previews">
				{
					this.state.posts.map(function(post) {
						return (
							<div className="preview" key={post.x.toString() + post.y.toString() + 
								+ post.postData.LocalId.toString()}
								data-post-id={post.postData.LocalId}
								style={{left: post.x, top: post.y}} 
								onMouseLeave={mouseOutHandler}>
								<Post postData={post.postData} opPostId={post.postData.ThreadId} />
							</div>
						)
					})
				}
			</div>
		)
	}
});

var PostVideo = React.createClass({
	getInitialState: function() {
		return {opened: false};
	},
	showPlayer: function(evt) {
		if (evt.button == 0) {
			this.setState({opened: true});
			evt.preventDefault();
		}
	},
	render: function() {
		if (this.state.opened) {
			return <video className="post-video" autoPlay controls src={"/static/uploads/" + this.props.videoName}>
			</video>;
		} else {
			var nameParts = this.props.videoName.split('.');
			nameParts.pop();
			var thumbnailName = nameParts.join('.') + '.jpg';
			return (<a className="post-image post-video-thumb"
					href={"/static/uploads/" + this.props.videoName} >
				<img src={"/static/uploads/thumb" + thumbnailName} className="img-thumbnail"
					alt={this.props.videoName} onClick={this.showPlayer}>
				</img>
				<div className="post-video-playicon">
					<span className="glyphicon glyphicon-play">
					</span>
				</div>
			</a>);
		}
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
			<form className="form-horizontal panel-body" action="#" role="form" onSubmit={gvnb.attemptPosting.bind(gvnb)}>
				<div className="form-group">
					<label className="control-label col-sm-2">Тема</label>
					<div className="col-sm-10">
						<input id="input_topic" name="topic" type="text" className="form-control"
							autoComplete='off' />
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
						<input id="input_file" name="file" type="file" multiple />
					</div>
				</div>
				<div className="form-group">
					<div className="col-sm-2 col-sm-offset-2">
						{ _.contains(gvnb.config.BoardConfigs[gvnb.state.board].EnabledFeatures, 'sage') ?
							<input id="input_sage" type="checkbox" name="sage" className="checkbox-inline" value="">
								SAGE
							</input>
							: null
						}
						{ _.contains(gvnb.config.BoardConfigs[gvnb.state.board].EnabledFeatures, 'op') ?
							<input id="input_op" type="checkbox" name="op" className="checkbox-inline" value="">
								OP
							</input>
							: null
						}
					</div>
				</div>
				{
					this.props.captcha && 
					_.contains(gvnb.config.BoardConfigs[gvnb.state.board].EnabledFeatures, 'captcha') ?
					<div className="form-group">
						<label className="control-label col-sm-2">Капча</label>
						<div className="col-sm-10">
							<img src={"data:image/png;base64," + this.props.captcha}></img>
						</div>
					</div>
					: null
				}
				{
					this.props.captcha &&
					_.contains(gvnb.config.BoardConfigs[gvnb.state.board].EnabledFeatures, 'captcha') ?
					<div className="form-group">
						<label className="control-label col-sm-2">Ответ</label>
						<div className="col-sm-10">
							<input id="input_captcha" name="captcha" type="text" className="form-control"
								autoComplete='off' />
						</div>
					</div>
					: null
				}
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
