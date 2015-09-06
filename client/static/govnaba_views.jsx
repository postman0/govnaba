
ViewContext = {
	NONE: 0,
	MAINPAGE: 1,
	BOARD: 2,
	THREAD: 3
}

var IntlMixin = ReactIntl.IntlMixin;
var FormattedRelative = ReactIntl.FormattedRelative;
var FormattedMessage = ReactIntl.FormattedMessage;

var Base = React.createClass({
	mixins: [IntlMixin],

	getInitialState: function() {
		return {ctx: ViewContext.NONE}
	},
	displayMainPage: function(boardList) {
		this.setState({ctx: ViewContext.MAINPAGE, 
			boards: boardList, threads: null, posts: null, 
			curBoard: null, curThread: null});
		this.setPageTitle(this.getIntlMessage("config.sitename"));
	},
	displayTopThreads: function(msg) {
		this.setState({newThreads: msg.NewThreads, mostAnsweredThreads: msg.MostAnsweredThreads});
	},
	displayBoard: function(boardMsg) {
		this.setState({ctx: ViewContext.BOARD, threads: boardMsg.Threads, 
			curBoard: boardMsg.Board, curThread: null});
		this.setPageTitle('/' + boardMsg.Board + '/ — ' + this.getIntlMessage("config.sitename"));
	},
	displayThread: function(postsMsg) {
		var threadId = postsMsg.Posts[0].LocalId;
		this.setState({ctx: ViewContext.THREAD, posts: postsMsg.Posts,
			curBoard: postsMsg.Board, curThread: threadId});
		var threadTopic = postsMsg.Posts[0].Topic;
		if (threadTopic != '')
			this.setPageTitle(threadTopic + ' — ' + this.getIntlMessage("config.sitename"))
		else
			this.setPageTitle(_.template("/<%= board %>/ #<%= tid %> — <%= site %>")({
				board: postsMsg.Board,
				tid: threadId,
				site: this.getIntlMessage("config.sitename")
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
	displayNotification: function(str) {
		this.refs.notifArea.addNotification(str);
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
	            <div id="content-board" className={this.state.ctx == ViewContext.MAINPAGE ? "col-md-10" : "col-md-8"}>
	            	{ this.state.ctx == ViewContext.MAINPAGE ?
	            		<div className="main-page-container">
		            		<h2 className="main-page-title">{this.getIntlMessage("config.mainpagetitle")}</h2>
		            		<h4 className="main-page-subtitle">{this.getIntlMessage("config.mainpagesubtitle")}</h4>
	            			{ (this.state.newThreads && this.state.mostAnsweredThreads) ?
	            			<div className="row main-page-threads-container">
	            				<div className="col-md-6">
	            					<h4>{this.getIntlMessage("mainpage.newthreads")}</h4>
	      							<ul className="list-group">
	      							{
	            						this.state.newThreads.map(function(val){
	            							return <TopThread post={val} />
	            						})
	            					}
	            					</ul>
	            				</div>
	            				<div className="col-md-6">
	            					<h4>{this.getIntlMessage("mainpage.mostansweredthreads")}</h4>
	            					{
	            						this.state.mostAnsweredThreads.map(function(val){
	            							return <TopThread post={val} />
	            						})
	            					}
	            				</div>
	            			</div>
	            			: null 
	            			}
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
        	<NotificationArea ref="notifArea" />
        </div>
		);
	}
})

var TopThread = React.createClass({
	mixins: [IntlMixin],
	render: function() {
		var data = this.props.post;
		return <a href={"/" + data.Board + "/" + data.LocalId}
				className="list-group-item">
			<h5 className="list-group-item-heading pull-right">/{data.Board}/</h5>
			<h5 className="list-group-item-heading">#{data.LocalId} {data.Topic ? ("- " + data.Topic) : null}</h5>
			<p className="list-group-item-text">{data.Contents}</p>
		</a>
	}
})

var NavBar = React.createClass({
	mixins: [IntlMixin],
	render: function() {
		return (
			<nav className="navbar navbar-default navbar-static-top">
				<div className="navbar-header">
					<a className="navbar-brand" href="/">{this.getIntlMessage("config.sitename")}</a>
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
							<input id="input_login_key" type="text" className="form-control" 
								placeholder={this.getIntlMessage("navbar.key")}></input>
							<input id="input_login_submit" type="submit" className="form-control" 
								value={this.getIntlMessage("navbar.submit")}></input>
						</form>
					</div>
				</div>
			</nav>
		)
	}
})

var NavBreadCrumbs = React.createClass({
	mixins: [IntlMixin],
	render: function() {
		var board = null;
		if(this.props.board)
			board = <li><a href={"/"+this.props.board+"/"}>{"/"+this.props.board+"/"}</a></li>
		var thread = null;
		if(this.props.thread)
			thread = (<li><a href={"/"+this.props.board+"/"+this.props.thread}>
				<FormattedMessage message={this.getIntlMessage("navbreadcrumbs.thread")}
					thread={this.props.thread} />
		</a></li>)
		return (
			<div className="col-md-12">
				<ol className="breadcrumb breadcrumb-navbar">
					<li><a href="/">{this.getIntlMessage("navbreadcrumbs.main")}</a></li>
					{board}
					{thread}
				</ol>
			</div>
		)
	}
})


var BoardList = React.createClass({
	mixins: [IntlMixin],
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
	mixins: [IntlMixin],
	render: function() {
		return (
			<div className="board">
				{this.props.threads.map(function(val) {
					return (
						[<Thread posts={val} key={val[0].LocalId}/>,
						 <div className="board-thread-delim">&lowast;&lowast;&lowast;</div>]
					)
				})}
				<nav>
					<ul className="pager">
						<li><a href={"/" + gvnb.state.board + "?page=" + (gvnb.state.page-1)}>
							{this.getIntlMessage("pager.back")}
						</a></li>
						<li><a href={"/" + gvnb.state.board + "?page=" + (gvnb.state.page+1)}>
							{this.getIntlMessage("pager.forward")}
						</a></li>
					</ul>
				</nav>
			</div>
		)
	}
})

var Thread = React.createClass({
	mixins: [IntlMixin],
	render: function() {
		var opId = this.props.posts[0].LocalId;
		var posts = this.props.posts;
		if (posts.length > 1 && posts[1].PostNum > 2) {
			return (
			<div className="thread-container">
				<Post postData={posts[0]} opPostId={opId} key={opId} />
				<div className="thread-skipped">
					<a href={gvnb.getThreadLink(opId, opId)} className="thread-skipped-count">
						<FormattedMessage message={this.getIntlMessage("thread.skippedcount")} 
							count={posts[1].PostNum - 2} />
					</a>
				</div>
				{this.props.posts.slice(1).map(function(val) {
					return (
						<Post postData={val} opPostId={opId} key={val.LocalId}/>
					)
				})}
			</div>
		)
		} else return (
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
	mixins: [IntlMixin],
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
		var date = <FormattedRelative value={this.props.postData.Date} />;
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
		if ((imgs || videos) && !attrs.deleted && !attrs.deletedMod) {
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
			deleteButton = <a className="post-delete-button" href='#' title={this.getIntlMessage("post.delete")}
				onClick={function(evt){gvnb.deletePost(argBoard, argId);
					evt.preventDefault();}} >
				<span className="glyphicon glyphicon-remove"></span>
			</a> 
		};

		var self = this;
		var lockButton = null, pinButton = null;
		if (gvnb.hasModRights() && this.props.postData.LocalId == this.props.opPostId) {
			lockButton = <a className="post-lock-button" href='#' title={this.getIntlMessage("post.lock")}
				onClick={function(evt){gvnb.lockThread(argBoard, argId, !self.props.postData.IsLocked);
					evt.preventDefault();}} >
				<span className="glyphicon glyphicon-lock"></span>
			</a>;
			pinButton = <a className="post-pin-button" href='#' title={this.getIntlMessage("post.pin")}
				onClick={function(evt){gvnb.pinThread(argBoard, argId, !self.props.postData.IsPinned);
					evt.preventDefault();}} >
				<span className="glyphicon glyphicon-pushpin"></span>
			</a>;
		}

		var answers = null;
		if (attrs && attrs.answers) {
			answers = <div className="post-answers">
			{this.getIntlMessage("post.answers") + " "}
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
		if (gvnb.isBoardFeatureEnabled('ipIdent') && attrs && attrs.ipIdent) {
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
			bodyContent = <span className="post-deleted-body">{this.getIntlMessage("post.deleted")}</span>
		} else if (attrs && attrs.deletedMod) {
			bodyContent = <span className="post-deleted-body">{this.getIntlMessage("post.deletedmod")}</span>
		} else {
			bodyContent = <div className="post-body" 
				dangerouslySetInnerHTML={this.processMarkup(this.props.postData.Contents)}>
			</div>
		};

		var replyClickHandler = function(evt) {
			var node = $('#input_contents')[0];
			var startPos = node.selectionStart || 0;
			var endPos = node.selectionEnd || startPos;
			node.value = node.value.substring(0, startPos) + '>>' + argId +
				node.value.substring(endPos, node.value.length);
			evt.preventDefault();
		};

		var isOp = (this.props.opPostId == this.props.postData.LocalId);
		var openLink = null;
		if (isOp) {
			openLink = (<div className="post-open-link">
				<a href={gvnb.getThreadLink(this.props.opPostId, this.props.postData.LocalId)}>
					<span className="glyphicon glyphicon-new-window"></span>&nbsp;
					{this.getIntlMessage("thread.open")}
				</a>
			</div>);
		}

		return (
			<div id={"post-" + this.props.postData.LocalId}
				className={"panel panel-default post-container " + 
					((attrs && (attrs.deleted || attrs.deletedMod)) ? "post-deleted" : "")} >
				<div className="panel-heading">
				<a 
					href={gvnb.getThreadLink(this.props.opPostId, this.props.postData.LocalId)} 
					className="post-header-id">#{this.props.postData.LocalId}</a>
				<a className="post-header-reply" href="#" onClick={replyClickHandler}
					title={this.getIntlMessage("post.reply")}>
					<span className="glyphicon glyphicon-pencil"></span>
				</a>
				{pinned}
				{locked}
				{topic}
				{ipIdent}
				{ country }
				{ (attrs && attrs.sage) ? <span className='label label-sage'>SAGE</span> : null}
				{ (attrs && attrs.op) ? <span className='label label-primary'>OP</span> : null}
				{ (attrs && attrs.adminLabel) ? <span className='label label-admin'>ADMIN</span> : null}
				{ (attrs && attrs.modLabel) ? <span className='label label-success'>MOD</span> : null}
				<span className="post-header-date" title={datestr}>{date}</span>
				<span className="clearfix" />
				</div>
				<div className="panel-body">
					{files}
					{bodyContent}
					{answers}
					<div className="clearfix"></div>
					{openLink}
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
	mixins: [IntlMixin],
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
	mixins: [IntlMixin],
	render: function() {
		var submitCaption;
		switch (this.props.type) {
			case "thread": submitCaption = this.getIntlMessage("postingform.submit.thread"); break;
			case "board":  submitCaption = this.getIntlMessage("postingform.submit.board"); break;
		};
		return (
			<div className="panel panel-default postform">
			<form className="form-horizontal panel-body" action="#" role="form" onSubmit={gvnb.attemptPosting.bind(gvnb)}>
				<div className="form-group">
					<label className="control-label col-sm-2">{this.getIntlMessage("postingform.topic")}</label>
					<div className="col-sm-10">
						<input id="input_topic" name="topic" type="text" className="form-control"
							autoComplete='off' />
					</div>
				</div>
				<div className="form-group">
					<label className="control-label col-sm-2">{this.getIntlMessage("postingform.contents")}</label>
					<div className="col-sm-10">
						<textarea id="input_contents" name="contents" className="form-control" required>
						</textarea>
					</div>
				</div>
				<div className="form-group">
					<label className="control-label col-sm-2">{this.getIntlMessage("postingform.file")}</label>
					<div className="col-sm-10">
						<input id="input_file" name="file" type="file" multiple />
					</div>
				</div>
				<div className="form-group">
					<div className="col-sm-4 col-sm-offset-2">
						{ gvnb.isBoardFeatureEnabled("sage") ?
							<input id="sage" type="checkbox" name="sage" className="input-attr checkbox-inline" value="">
								SAGE
							</input>
							: null
						}
						{ gvnb.isBoardFeatureEnabled("op") ?
							<input id="op" type="checkbox" name="op" className="input-attr checkbox-inline" value="">
								OP
							</input>
							: null
						}
						{ gvnb.isBoardFeatureEnabled("modLabels") && gvnb.hasModRights() ?
							<input id="modLabel" type="checkbox" name="modLabel" className="input-attr checkbox-inline" value="">
								MOD
							</input>
							: null
						}
						{ gvnb.isBoardFeatureEnabled("modLabels") && gvnb.isAdmin() ?
							<input id="adminLabel" type="checkbox" name="adminLabel" className="input-attr checkbox-inline" value="">
								ADMIN
							</input>
							: null
						}
					</div>
				</div>
				{
					this.props.captcha && gvnb.isBoardFeatureEnabled('captcha') ?
					<div className="form-group">
						<label className="control-label col-sm-2">{this.getIntlMessage("postingform.captcha")}</label>
						<div className="col-sm-10 postform-captcha-container">
							<img src={"data:image/png;base64," + this.props.captcha} 
								onClick={function(evt){gvnb.getNewCaptcha()}}></img>
						</div>
					</div>
					: null
				}
				{
					this.props.captcha && gvnb.isBoardFeatureEnabled('captcha') ?
					<div className="form-group">
						<label className="control-label col-sm-2">{this.getIntlMessage("postingform.solution")}</label>
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
});

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var NotificationArea = React.createClass({
	mixins: [IntlMixin],
	getInitialState: function() {
		return {items: {}};
	},
	addNotification: function(str) {
		var items = this.state.items;
		var key = new Date();
		items[key] = str;
		this.setState({items: items});
		var self = this;
		setTimeout(function() {
			var items = self.state.items;
			delete items[key]
			self.setState({items: items});
		}, 3000);
	},
	render: function() {
		return <ReactCSSTransitionGroup component="ul" className="notifications list-group"
		transitionName="notification">
			{ _.mapObject(this.state.items, function(val, key) {
				return <div className="list-group-item" key={key}>
					{val}
				</div>
			})
			}
			</ReactCSSTransitionGroup>
	}
});

var GovnabaViews = {
	mountBaseContainer: function() {
		var locale = _.contains(intlData.locales, navigator.language) ? navigator.language : "en-US";
		return React.render(<Base locales={[locale]} messages={intlData.messages[locale]} />, 
			document.getElementsByTagName("body")[0]);
	}
};
