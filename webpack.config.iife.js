const path = require('path');
const webpack = require('webpack');
const npmPackage = require('./package.json');
const banner = `${npmPackage.name} ${npmPackage.version} \nCopyright 2018 Statful \nhttps://www.statful.com`;

module.exports = () => {
    return {
        entry: {
            'statful': './src/statful.js',
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].min.js'
        },
        plugins: [
            new webpack.BannerPlugin(banner)
        ],
        module: {
            rules: [
                {
                    test: /\.(js)$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: ['env'],
                                plugins: ['babel-plugin-add-module-exports']
                            }
                        }
                    ]
                }
            ]
        }
    };
};
