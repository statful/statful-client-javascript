const path = require('path');
const merge = require('webpack-merge');
const webpackConfig = require('./webpack.config');

module.exports = () => {
    return merge(webpackConfig, {
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].umd.min.js',
            library: 'statful',
            libraryTarget: 'umd',
            libraryExport: 'default'
        }
    });
};
