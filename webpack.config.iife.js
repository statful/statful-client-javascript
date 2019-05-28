const path = require('path');
const merge = require('webpack-merge');
const webpackConfig = require('./webpack.config');

module.exports = () => {
    return merge(webpackConfig, {
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].min.js'
        }
    });
};
