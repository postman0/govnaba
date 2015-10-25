var webpack = require('webpack');
var path = require('path');

module.exports = {

	entry: "./src/main.js",

	resolve: {
		root: path.resolve("./src"),
		extensions: ["", ".js", ".jsx"]
	},

	output: {
		path:     './static/',
		filename: 'main.js'
	},

	module: {
	loaders: [
		{
			test: /\.jsx?$/,
			exclude: /(node_modules|bower_components)/,
			loader: 'babel'
		}
		]
	},
	plugins: [
		new webpack.optimize.UglifyJsPlugin([])
	]
}