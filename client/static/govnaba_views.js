
ViewContext = {
	NONE: 0,
	MAINPAGE: 1,
	BOARD: 2,
	THREAD: 3
}

var IntlMixin = ReactIntl.IntlMixin;
var FormattedRelative = ReactIntl.FormattedRelative;
var FormattedMessage = ReactIntl.FormattedMessage;

var Base = React.createClass({displayName: "Base",
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
			boardList = React.createElement(BoardList, {boards: this.state.boards});
		}
		if (this.state.ctx == ViewContext.BOARD) {
			threads = React.createElement(Board, {threads: this.state.threads});
		}
		if (this.state.ctx == ViewContext.THREAD) {
			posts = React.createElement(Thread, {posts: this.state.posts});
		}
		return (
		React.createElement("div", {id: "content-main", className: "container-fluid"}, 
			React.createElement(NavBar, {users: this.state.users}), 
			React.createElement("div", {className: "row"}, 
				React.createElement(NavBreadCrumbs, {thread: this.state.curThread, board: this.state.curBoard})
			), 
			React.createElement("div", {className: "row"}, 
	            React.createElement("div", {id: "board-list", className: "col-md-2"}, 
	            	boardList
	            ), 
	            React.createElement("div", {id: "content-board", className: this.state.ctx == ViewContext.MAINPAGE ? "col-md-10" : "col-md-8"}, 
	            	 this.state.ctx == ViewContext.MAINPAGE ?
	            		React.createElement("div", {className: "main-page-container"}, 
		            		React.createElement("h2", {className: "main-page-title"}, this.getIntlMessage("config.mainpagetitle")), 
		            		React.createElement("h4", {className: "main-page-subtitle"}, this.getIntlMessage("config.mainpagesubtitle")), 
	            			 (this.state.newThreads && this.state.mostAnsweredThreads) ?
	            			React.createElement("div", {className: "row main-page-threads-container"}, 
	            				React.createElement("div", {className: "col-md-6"}, 
	            					React.createElement("h4", null, this.getIntlMessage("mainpage.newthreads")), 
	      							React.createElement("ul", {className: "list-group"}, 
	      							
	            						this.state.newThreads.map(function(val){
	            							return React.createElement(TopThread, {post: val})
	            						})
	            					
	            					)
	            				), 
	            				React.createElement("div", {className: "col-md-6"}, 
	            					React.createElement("h4", null, this.getIntlMessage("mainpage.mostansweredthreads")), 
	            					
	            						this.state.mostAnsweredThreads.map(function(val){
	            							return React.createElement(TopThread, {post: val})
	            						})
	            					
	            				)
	            			)
	            			: null
	            			
	            		)
	            		: null, 
	            	
		             this.state.ctx == ViewContext.BOARD ? 
		            	React.createElement(PostingForm, {type: "board", captcha: this.state.captcha}) 
		            	: null, 
		            threads, 
		            posts, 
		             this.state.ctx == ViewContext.THREAD ? 
		            	React.createElement(PostingForm, {type: "thread", captcha: this.state.captcha}) 
		            	: null
            	)
        	), 
        	React.createElement(PostPreviews, {ref: "previews"}), 
        	React.createElement(NotificationArea, {ref: "notifArea"})
        )
		);
	}
})

var TopThread = React.createClass({displayName: "TopThread",
	mixins: [IntlMixin],
	render: function() {
		var data = this.props.post;
		return React.createElement("a", {href: "/" + data.Board + "/" + data.LocalId, 
				className: "list-group-item"}, 
			React.createElement("h5", {className: "list-group-item-heading pull-right"}, "/", data.Board, "/"), 
			React.createElement("h5", {className: "list-group-item-heading"}, "#", data.LocalId, " ", data.Topic ? ("- " + data.Topic) : null), 
			React.createElement("p", {className: "list-group-item-text"}, data.Contents)
		)
	}
})

var NavBar = React.createClass({displayName: "NavBar",
	mixins: [IntlMixin],
	render: function() {
		return (
			React.createElement("nav", {className: "navbar navbar-default navbar-static-top"}, 
				React.createElement("div", {className: "navbar-header"}, 
					React.createElement("a", {className: "navbar-brand", href: "/"}, this.getIntlMessage("config.sitename"))
				), 
				 this.props.users ? 
					React.createElement("div", {className: "navbar-users navbar-text"}, 
						React.createElement("span", {className: "glyphicon glyphicon-user icon-usercount"}), 
						this.props.users
					) 
					: null, 
				
				React.createElement("div", {className: "collapse navbar-collapse"}, 
					React.createElement("div", {className: "navbar-form navbar-right"}, 
						React.createElement("form", {className: "form-inline", action: "#", onSubmit: gvnb.sendLoginForm.bind(gvnb)}, 
							React.createElement("input", {id: "input_login_key", type: "text", className: "form-control", 
								placeholder: this.getIntlMessage("navbar.key")}), 
							React.createElement("input", {id: "input_login_submit", type: "submit", className: "form-control", 
								value: this.getIntlMessage("navbar.submit")})
						)
					)
				)
			)
		)
	}
})

var NavBreadCrumbs = React.createClass({displayName: "NavBreadCrumbs",
	mixins: [IntlMixin],
	render: function() {
		var board = null;
		if(this.props.board)
			board = React.createElement("li", null, React.createElement("a", {href: "/"+this.props.board+"/"}, "/"+this.props.board+"/"))
		var thread = null;
		if(this.props.thread)
			thread = (React.createElement("li", null, React.createElement("a", {href: "/"+this.props.board+"/"+this.props.thread}, 
				React.createElement(FormattedMessage, {message: this.getIntlMessage("navbreadcrumbs.thread"), 
					thread: this.props.thread})
		)))
		return (
			React.createElement("div", {className: "col-md-12"}, 
				React.createElement("ol", {className: "breadcrumb breadcrumb-navbar"}, 
					React.createElement("li", null, React.createElement("a", {href: "/"}, this.getIntlMessage("navbreadcrumbs.main"))), 
					board, 
					thread
				)
			)
		)
	}
})


var BoardList = React.createClass({displayName: "BoardList",
	mixins: [IntlMixin],
	render: function() {
		var boards = this.props.boards.map(function(board) {
			return (
				React.createElement("li", {className: "list-group-item", key: board}, React.createElement("a", {href: "/"+board+"/"}, "/", board, "/"))
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
	mixins: [IntlMixin],
	render: function() {
		return (
			React.createElement("div", {className: "board"}, 
				this.props.threads.map(function(val) {
					return (
						[React.createElement(Thread, {posts: val, key: val[0].LocalId}),
						 React.createElement("div", {className: "board-thread-delim"}, "∗∗∗")]
					)
				}), 
				React.createElement("nav", null, 
					React.createElement("ul", {className: "pager"}, 
						React.createElement("li", null, React.createElement("a", {href: "/" + gvnb.state.board + "?page=" + (gvnb.state.page-1)}, 
							this.getIntlMessage("pager.back")
						)), 
						React.createElement("li", null, React.createElement("a", {href: "/" + gvnb.state.board + "?page=" + (gvnb.state.page+1)}, 
							this.getIntlMessage("pager.forward")
						))
					)
				)
			)
		)
	}
})

var Thread = React.createClass({displayName: "Thread",
	mixins: [IntlMixin],
	render: function() {
		var opId = this.props.posts[0].LocalId;
		var posts = this.props.posts;
		if (posts.length > 1 && posts[1].PostNum > 2) {
			return (
			React.createElement("div", {className: "thread-container"}, 
				React.createElement(Post, {postData: posts[0], opPostId: opId, key: opId}), 
				React.createElement("div", {className: "thread-skipped"}, 
					React.createElement("a", {href: gvnb.getThreadLink(opId, opId), className: "thread-skipped-count"}, 
						React.createElement(FormattedMessage, {message: this.getIntlMessage("thread.skippedcount"), 
							count: posts[1].PostNum - 2})
					)
				), 
				this.props.posts.slice(1).map(function(val) {
					return (
						React.createElement(Post, {postData: val, opPostId: opId, key: val.LocalId})
					)
				})
			)
		)
		} else return (
			React.createElement("div", {className: "thread-container"}, 
				this.props.posts.map(function(val) {
					return (
						React.createElement(Post, {postData: val, opPostId: opId, key: val.LocalId})
					)
				})
			)
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

var Post = React.createClass({displayName: "Post",
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
		var date = React.createElement(FormattedRelative, {value: this.props.postData.Date});
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
						React.createElement("a", {href: "/static/uploads/"+imgName, target: "_blank", key: imgName}, 
							React.createElement("img", {className: "post-image img-thumbnail", src: "/static/uploads/thumb"+imgName, 
							 alt: imgName, onClick: gvnb.expandImage})
						)
					)
				});
		};
		var videos = null;
		if (attrs && attrs.videos) {
			videos = attrs.videos.map(function(vidName){
				return (React.createElement(PostVideo, {videoName: vidName, key: vidName}));
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
				React.createElement("div", {className: "post-files " + (length > 1 ? "post-files-many" : "pull-left")}, 
					imgs, 
					videos
				))
		}
		var topic = null;
		if (this.props.postData.Topic) {
			topic = React.createElement("span", {className: "post-header-topic"}, this.props.postData.Topic)
		}

		var locked = null, pinned = null;
		if (this.props.postData.LocalId == this.props.opPostId) {
			if (this.props.postData.IsLocked) {
				locked = React.createElement("span", {className: "post-thread-attrs glyphicon glyphicon-lock"})
			};
			if (this.props.postData.IsPinned) {
				pinned = React.createElement("span", {className: "post-thread-attrs glyphicon glyphicon-pushpin"})
			};
		}

		var argBoard = gvnb.state.board;
		var argId = this.props.postData.LocalId;

		var deleteButton = null;
		if (attrs && attrs.own || gvnb.hasModRights()) {
			deleteButton = React.createElement("a", {className: "post-delete-button", href: "#", title: this.getIntlMessage("post.delete"), 
				onClick: function(evt){gvnb.deletePost(argBoard, argId);
					evt.preventDefault();}}, 
				React.createElement("span", {className: "glyphicon glyphicon-remove"})
			) 
		};

		var self = this;
		var lockButton = null, pinButton = null;
		if (gvnb.hasModRights() && this.props.postData.LocalId == this.props.opPostId) {
			lockButton = React.createElement("a", {className: "post-lock-button", href: "#", title: this.getIntlMessage("post.lock"), 
				onClick: function(evt){gvnb.lockThread(argBoard, argId, !self.props.postData.IsLocked);
					evt.preventDefault();}}, 
				React.createElement("span", {className: "glyphicon glyphicon-lock"})
			);
			pinButton = React.createElement("a", {className: "post-pin-button", href: "#", title: this.getIntlMessage("post.pin"), 
				onClick: function(evt){gvnb.pinThread(argBoard, argId, !self.props.postData.IsPinned);
					evt.preventDefault();}}, 
				React.createElement("span", {className: "glyphicon glyphicon-pushpin"})
			);
		}

		var answers = null;
		if (attrs && attrs.answers) {
			answers = React.createElement("div", {className: "post-answers"}, 
			this.getIntlMessage("post.answers") + " ", 
			
				Object.keys(attrs.answers).map(function(answ){
					return (
						React.createElement("a", {className: "post-answer post-reference", href: gvnb.getThreadLink(attrs.answers[answ], answ), 
							"data-thread-id": attrs.answers[answ], "data-post-id": answ, key: answ}, 
						"#", answ
						))
				})
			
			)
		}

		var country = null;
		if (gvnb.isBoardFeatureEnabled('country') && attrs && attrs.country) {
			country = React.createElement("img", {className: "post-header-country", src: "/static/flags/" + attrs.country + '.png', alt: attrs.country})
		}

		var ipIdent = null;
		if (gvnb.isBoardFeatureEnabled('ipIdent') && attrs && attrs.ipIdent) {
			var elems = [];
			for (var i = 0; i < 8; i++) {
				var colours = attrs.ipIdent.slice(i*4, i*4+4);
				var colourValue = {"background-color": "rgb(" + colours[0] +"," + colours[1] +"," + colours[2] +");"};
				elems.push(React.createElement("span", {className: "post-ip-ident-elem", style: colourValue}, 
					colours[3]
					));
			}
			ipIdent = React.createElement("span", {className: "post-ip-ident"}, elems);
		}

		var bodyContent = null;
		if (attrs && attrs.deleted) {
			bodyContent = React.createElement("span", {className: "post-deleted-body"}, this.getIntlMessage("post.deleted"))
		} else if (attrs && attrs.deletedMod) {
			bodyContent = React.createElement("span", {className: "post-deleted-body"}, this.getIntlMessage("post.deletedmod"))
		} else {
			bodyContent = React.createElement("div", {className: "post-body", 
				dangerouslySetInnerHTML: this.processMarkup(this.props.postData.Contents)}
			)
		};

		var replyClickHandler = function(evt) {
			var node = $('#input_contents')[0];
			var startPos = node.selectionStart || 0;
			var endPos = node.selectionEnd || startPos;
			node.value = node.value.substring(0, startPos) + '>>' + argId +
				node.value.substring(endPos, node.value.length);
			evt.preventDefault();
		};
		return (
			React.createElement("div", {id: "post-" + this.props.postData.LocalId, 
				className: "panel panel-default post-container " + 
					((attrs && (attrs.deleted || attrs.deletedMod)) ? "post-deleted" : "")}, 
				React.createElement("div", {className: "panel-heading"}, 
				React.createElement("a", {
					href: gvnb.getThreadLink(this.props.opPostId, this.props.postData.LocalId), 
					className: "post-header-id"}, "#", this.props.postData.LocalId), 
				React.createElement("a", {className: "post-header-reply", href: "#", onClick: replyClickHandler, 
					title: this.getIntlMessage("post.reply")}, 
					React.createElement("span", {className: "glyphicon glyphicon-pencil"})
				), 
				pinned, 
				locked, 
				topic, 
				ipIdent, 
				country, 
				 (attrs && attrs.sage) ? React.createElement("span", {className: "label label-sage"}, "SAGE") : null, 
				 (attrs && attrs.op) ? React.createElement("span", {className: "label label-primary"}, "OP") : null, 
				 (attrs && attrs.adminLabel) ? React.createElement("span", {className: "label label-admin"}, "ADMIN") : null, 
				 (attrs && attrs.modLabel) ? React.createElement("span", {className: "label label-success"}, "MOD") : null, 
				React.createElement("span", {className: "post-header-date", title: datestr}, date), 
				React.createElement("span", {className: "clearfix"})
				), 
				React.createElement("div", {className: "panel-body"}, 
					files, 
					bodyContent, 
					answers, 
					React.createElement("span", {className: "post-actions"}, 
						pinButton, lockButton, deleteButton
					)
				)
			)
		)
	},

	componentDidMount: function() {
		$(this.getDOMNode()).find('.post-reference').mouseover(gvnb.showPostPreview.bind(gvnb));
	}
});

var PostPreviews = React.createClass({displayName: "PostPreviews",
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
			React.createElement("div", {className: "previews"}, 
				
					this.state.posts.map(function(post) {
						return (
							React.createElement("div", {className: "preview", key: post.x.toString() + post.y.toString() + 
								+ post.postData.LocalId.toString(), 
								"data-post-id": post.postData.LocalId, 
								style: {left: post.x, top: post.y}, 
								onMouseLeave: mouseOutHandler}, 
								React.createElement(Post, {postData: post.postData, opPostId: post.postData.ThreadId})
							)
						)
					})
				
			)
		)
	}
});

var PostVideo = React.createClass({displayName: "PostVideo",
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
			return React.createElement("video", {className: "post-video", autoPlay: true, controls: true, src: "/static/uploads/" + this.props.videoName}
			);
		} else {
			var nameParts = this.props.videoName.split('.');
			nameParts.pop();
			var thumbnailName = nameParts.join('.') + '.jpg';
			return (React.createElement("a", {className: "post-image post-video-thumb", 
					href: "/static/uploads/" + this.props.videoName}, 
				React.createElement("img", {src: "/static/uploads/thumb" + thumbnailName, className: "img-thumbnail", 
					alt: this.props.videoName, onClick: this.showPlayer}
				), 
				React.createElement("div", {className: "post-video-playicon"}, 
					React.createElement("span", {className: "glyphicon glyphicon-play"}
					)
				)
			));
		}
	}
})

var PostingForm = React.createClass({displayName: "PostingForm",
	mixins: [IntlMixin],
	render: function() {
		var submitCaption;
		switch (this.props.type) {
			case "thread": submitCaption = this.getIntlMessage("postingform.submit.thread"); break;
			case "board":  submitCaption = this.getIntlMessage("postingform.submit.board"); break;
		};
		return (
			React.createElement("div", {className: "panel panel-default postform"}, 
			React.createElement("form", {className: "form-horizontal panel-body", action: "#", role: "form", onSubmit: gvnb.attemptPosting.bind(gvnb)}, 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("label", {className: "control-label col-sm-2"}, this.getIntlMessage("postingform.topic")), 
					React.createElement("div", {className: "col-sm-10"}, 
						React.createElement("input", {id: "input_topic", name: "topic", type: "text", className: "form-control", 
							autoComplete: "off"})
					)
				), 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("label", {className: "control-label col-sm-2"}, this.getIntlMessage("postingform.contents")), 
					React.createElement("div", {className: "col-sm-10"}, 
						React.createElement("textarea", {id: "input_contents", name: "contents", className: "form-control", required: true}
						)
					)
				), 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("label", {className: "control-label col-sm-2"}, this.getIntlMessage("postingform.file")), 
					React.createElement("div", {className: "col-sm-10"}, 
						React.createElement("input", {id: "input_file", name: "file", type: "file", multiple: true})
					)
				), 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("div", {className: "col-sm-4 col-sm-offset-2"}, 
						 gvnb.isBoardFeatureEnabled("sage") ?
							React.createElement("input", {id: "sage", type: "checkbox", name: "sage", className: "input-attr checkbox-inline", value: ""}, 
								"SAGE"
							)
							: null, 
						
						 gvnb.isBoardFeatureEnabled("op") ?
							React.createElement("input", {id: "op", type: "checkbox", name: "op", className: "input-attr checkbox-inline", value: ""}, 
								"OP"
							)
							: null, 
						
						 gvnb.isBoardFeatureEnabled("modLabels") && gvnb.hasModRights() ?
							React.createElement("input", {id: "modLabel", type: "checkbox", name: "modLabel", className: "input-attr checkbox-inline", value: ""}, 
								"MOD"
							)
							: null, 
						
						 gvnb.isBoardFeatureEnabled("modLabels") && gvnb.isAdmin() ?
							React.createElement("input", {id: "adminLabel", type: "checkbox", name: "adminLabel", className: "input-attr checkbox-inline", value: ""}, 
								"ADMIN"
							)
							: null
						
					)
				), 
				
					this.props.captcha && gvnb.isBoardFeatureEnabled('captcha') ?
					React.createElement("div", {className: "form-group"}, 
						React.createElement("label", {className: "control-label col-sm-2"}, this.getIntlMessage("postingform.captcha")), 
						React.createElement("div", {className: "col-sm-10"}, 
							React.createElement("img", {src: "data:image/png;base64," + this.props.captcha})
						)
					)
					: null, 
				
				
					this.props.captcha && gvnb.isBoardFeatureEnabled('captcha') ?
					React.createElement("div", {className: "form-group"}, 
						React.createElement("label", {className: "control-label col-sm-2"}, this.getIntlMessage("postingform.solution")), 
						React.createElement("div", {className: "col-sm-10"}, 
							React.createElement("input", {id: "input_captcha", name: "captcha", type: "text", className: "form-control", 
								autoComplete: "off"})
						)
					)
					: null, 
				
				React.createElement("div", {className: "form-group"}, 
					React.createElement("div", {className: "col-sm-2 col-sm-offset-2"}, 
						React.createElement("input", {type: "submit", className: "form-control", value: submitCaption})
					)
				)
			)
			)
		);
	}
});

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var NotificationArea = React.createClass({displayName: "NotificationArea",
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
		return React.createElement(ReactCSSTransitionGroup, {component: "ul", className: "notifications list-group", 
		transitionName: "notification"}, 
			 _.mapObject(this.state.items, function(val, key) {
				return React.createElement("div", {className: "list-group-item", key: key}, 
					val
				)
			})
			
			)
	}
});

var GovnabaViews = {
	mountBaseContainer: function() {
		var locale = _.contains(intlData.locales, navigator.language) ? navigator.language : "en-US";
		return React.render(React.createElement(Base, {locales: [locale], messages: intlData.messages[locale]}), 
			document.getElementsByTagName("body")[0]);
	}
};
