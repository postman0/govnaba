
ViewContext = {
	NONE: 0,
	MAINPAGE: 1,
	BOARD: 2,
	THREAD: 3
}

var Base = React.createClass({displayName: "Base",

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
	displayUserCount: function(count) {
		this.setState({users: count});
	},
	displayCaptcha: function(base64img) {
		this.setState({captcha: base64img});
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
	            React.createElement("div", {id: "content-board", className: "col-md-8"}, 
		             this.state.ctx == ViewContext.BOARD ? 
		            	React.createElement(PostingForm, {type: "board", captcha: this.state.captcha}) 
		            	: null, 
		            threads, 
		            posts, 
		             this.state.ctx == ViewContext.THREAD ? 
		            	React.createElement(PostingForm, {type: "thread", captcha: this.state.captcha}) 
		            	: null
            	)
        	)
        )
		);
	}
})

var NavBar = React.createClass({displayName: "NavBar",
	render: function() {
		return (
			React.createElement("nav", {className: "navbar navbar-default navbar-static-top"}, 
				React.createElement("div", {className: "navbar-header"}, 
					React.createElement("a", {className: "navbar-brand", href: "/"}, "Govnaba")
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
							React.createElement("input", {id: "input_login_key", type: "text", className: "form-control", placeholder: "Ключ"}), 
							React.createElement("input", {id: "input_login_submit", type: "submit", className: "form-control", value: "Вход"})
						)
					)
				)
			)
		)
	}
})

var NavBreadCrumbs = React.createClass({displayName: "NavBreadCrumbs",
	render: function() {
		var board = null;
		if(this.props.board)
			board = React.createElement("li", null, React.createElement("a", {href: "/"+this.props.board+"/"}, "/"+this.props.board+"/"))
		var thread = null;
		if(this.props.thread)
			thread = React.createElement("li", null, React.createElement("a", {href: "/"+this.props.board+"/"+this.props.thread}, "Тред #"+this.props.thread))
		return (
			React.createElement("div", {className: "col-md-12"}, 
				React.createElement("ol", {className: "breadcrumb breadcrumb-navbar"}, 
					React.createElement("li", null, React.createElement("a", {href: "/"}, "Главная")), 
					board, 
					thread
				)
			)
		)
	}
})


var BoardList = React.createClass({displayName: "BoardList",
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
	render: function() {
		return (
			React.createElement("div", {className: "board"}, 
				this.props.threads.map(function(val) {
					return (
						React.createElement(Thread, {posts: val, key: val[0].LocalId})
					)
				}), 
				React.createElement("nav", null, 
					React.createElement("ul", {className: "pager"}, 
						React.createElement("li", null, React.createElement("a", {href: "/" + gvnb.state.board + "?page=" + (gvnb.state.page-1)}, "Назад")), 
						React.createElement("li", null, React.createElement("a", {href: "/" + gvnb.state.board + "?page=" + (gvnb.state.page+1)}, "Вперед"))
					)
				)
			)
		)
	}
})

var Thread = React.createClass({displayName: "Thread",
	render: function() {
		var opId = this.props.posts[0].LocalId;
		return (
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

var Post = React.createClass({displayName: "Post",
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
				return '<a href="' + gvnb.getThreadLink(attrs.refs[id], id) + '">' + match + '</a>';
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

		text = text.replace(/\w(?:\w|\.|\-)*\:\S+/g, function(match) {
			return '<a target="_blank" href="' + safeTagsReplace(match).replace(/"/g, "&quot;") + '">' + 
				safeTagsReplace(match) + 
			'</a>';
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
		var imgs = null;
		attrs = this.props.postData.Attrs;
		if (attrs && attrs.images) {
			imgs = (
				React.createElement("div", {className: "post-images"}, 
				attrs.images.map(function(imgName){
					return (
						React.createElement("a", {href: "/static/uploads/"+imgName, target: "_blank"}, 
							React.createElement("img", {className: "post-image img-thumbnail pull-left", src: "/static/uploads/thumb"+imgName, 
							 alt: imgName})
						)
					)
				})
				)
			);
		}
		var topic = null;
		if (this.props.postData.Topic) {
			topic = React.createElement("span", {className: "post-header-topic"}, this.props.postData.Topic)
		}

		var answers = null;
		if (attrs && attrs.answers) {
			answers = React.createElement("div", {className: "post-answers"}, 
			"Ответы:",  
			
				Object.keys(attrs.answers).map(function(answ){
					return (
						React.createElement("a", {className: "post-answer", href: gvnb.getThreadLink(attrs.answers[answ], answ), 
							key: answ}, 
						"#", answ
						))
				})
			
			)
		}

		return (
			React.createElement("div", {id: "post-" + this.props.postData.LocalId, className: "panel panel-default post-container"}, 
				React.createElement("div", {className: "panel-heading"}, 
				React.createElement("a", {
					href: gvnb.getThreadLink(this.props.opPostId, this.props.postData.LocalId), 
					className: "post-header-id"}, "#", this.props.postData.LocalId), 
				topic, 
				 (attrs && attrs.sage) ? React.createElement("span", {className: "label label-sage"}, "SAGE") : null, 
				 (attrs && attrs.op) ? React.createElement("span", {className: "label label-primary"}, "OP") : null, 
				React.createElement("span", {className: "post-header-date"}, datestr)
				), 
				React.createElement("div", {className: "panel-body"}, 
					imgs, 
					React.createElement("div", {className: "post-body", 
						dangerouslySetInnerHTML: this.processMarkup(this.props.postData.Contents)}), 
					answers
				)
			)
		)
	}
})

var PostingForm = React.createClass({displayName: "PostingForm",
	render: function() {
		var submitCaption;
		switch (this.props.type) {
			case "thread": submitCaption = "Ответить"; break;
			case "board":  submitCaption = "Создать тред"; break;
		};
		return (
			React.createElement("div", {className: "panel panel-default postform"}, 
			React.createElement("form", {className: "form-horizontal panel-body", action: "#", role: "form", onSubmit: gvnb.sendPostingForm.bind(gvnb)}, 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("label", {className: "control-label col-sm-2"}, "Тема"), 
					React.createElement("div", {className: "col-sm-10"}, 
						React.createElement("input", {id: "input_topic", name: "topic", type: "text", className: "form-control"})
					)
				), 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("label", {className: "control-label col-sm-2"}, "Текст"), 
					React.createElement("div", {className: "col-sm-10"}, 
						React.createElement("textarea", {id: "input_contents", name: "contents", className: "form-control", required: true}
						)
					)
				), 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("label", {className: "control-label col-sm-2"}, "Файл"), 
					React.createElement("div", {className: "col-sm-10"}, 
						React.createElement("input", {id: "input_file", name: "file", type: "file"})
					)
				), 
				React.createElement("div", {className: "form-group"}, 
					React.createElement("div", {className: "col-sm-2 col-sm-offset-2"}, 
						React.createElement("input", {id: "input_sage", type: "checkbox", name: "sage", className: "checkbox-inline", value: ""}, 
							"SAGE"
						), 
						React.createElement("input", {id: "input_op", type: "checkbox", name: "op", className: "checkbox-inline", value: ""}, 
							"OP"
						)
					)
				), 
				
					this.props.captcha ?
					React.createElement("div", {className: "form-group"}, 
						React.createElement("label", {className: "control-label col-sm-2"}, "Капча"), 
						React.createElement("div", {className: "col-sm-10"}, 
							React.createElement("img", {src: "data:image/png;base64," + this.props.captcha})
						)
					)
					: null, 
				
				
					this.props.captcha ?
					React.createElement("div", {className: "form-group"}, 
						React.createElement("label", {className: "control-label col-sm-2"}, "Ответ"), 
						React.createElement("div", {className: "col-sm-10"}, 
							React.createElement("input", {id: "input_captcha", name: "captcha", type: "text", className: "form-control"})
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
})


var GovnabaViews = {
	mountBaseContainer: function() {
		return React.render(React.createElement(Base, null), document.getElementsByTagName("body")[0]);
	}
}
