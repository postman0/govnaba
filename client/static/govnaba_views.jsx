
var MainPage = React.createClass({
	render: function() {
		console.log(boards);
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


var GovnabaViews = function() {
	this.index = function(boards) {
		React.render(<MainPage boards={boards} />, document.getElementsByTagName('body')[0]);
	}

}
