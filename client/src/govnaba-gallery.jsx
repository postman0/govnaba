const React = require("react/addons")
const ReactIntl = require("react-intl")


var IntlMixin = ReactIntl.IntlMixin;
var FormattedRelative = ReactIntl.FormattedRelative;
var FormattedMessage = ReactIntl.FormattedMessage;


var GovnabaGallery = React.createClass({
	mixins: [IntlMixin],

	getInitialState: function() {
		return {imageIndex: this.props.startIndex || 0};
	},

	next: function() {
		if (this.props.images.length - this.state.imageIndex > 1)
			this.setState({imageIndex: this.state.imageIndex + 1});
		else
			this.setState({imageIndex: 0});
	},

	prev: function() {
		if (this.state.imageIndex > 0)
			this.setState({imageIndex: this.state.imageIndex - 1});
		else
			this.setState({imageIndex: this.props.images.length - 1});
	},

	render: function() {
		if (this.props.images.length > 0)
		return (<div className="gallery-container">
			<div className="gallery-image-container">
				<img src={"/static/uploads/" + this.props.images[this.state.imageIndex].name}
					className="gallery-image" id="gallery_image"></img>
			</div>
			<div className="gallery-controls-container">
				<a onClick={this.prev} className="gallery-controls-prev">
					<span className="glyphicon glyphicon-menu-left"></span>
				</a>
				<a onClick={ () => {window.gvnb.baseCont.displayGallery(false);} }
					className="gallery-controls-close">
					<span className="glyphicon glyphicon-remove"></span>
				</a>
				<a href={"/static/uploads/" + this.props.images[this.state.imageIndex].name}
					className="gallery-controls-url" target="_blank">
					{this.props.images[this.state.imageIndex].name}
				</a>
				<span className="gallery-controls-image-count">
					{this.state.imageIndex + 1}/{this.props.images.length}
				</span>
				<a href={this.props.threadUrl + "#" + this.props.images[this.state.imageIndex].postId}
					className="gallery-controls-post-link">
					<span className="glyphicon glyphicon-comment"></span>
				</a>
				<a onClick={this.next} className="gallery-controls-next">
					<span className="glyphicon glyphicon-menu-right"></span>
				</a>
			</div>
		</div>);
		else return (<span></span>);
	}
});

export default GovnabaGallery;
