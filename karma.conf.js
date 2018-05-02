/*global __dirname, module*/

module.exports = function (config) {
    config.set({
        browsers: ['PhantomJS'],
        files: [
            { pattern: require.resolve('usertiming'), include: false },
            { pattern: require.resolve('jasmine-ajax'), include: true },
            { pattern: 'node_modules/babel-polyfill/browser.js', instrument: false },
            { pattern: 'tests.webpack.js', watched: false }
        ],
        frameworks: [
            'jasmine'
        ],
        preprocessors: {
            'src/**/*.js': ['webpack', 'sourcemap'],
            'tests.webpack.js': ['webpack']
        },
        colors: true,
        logLevel: config.LOG_INFO,
        captureTimeout: 60000,
        singleRun: true,
        autoWatch: false,
        reporters: ['progress', 'coverage-istanbul'],
        webpack: {
            mode: 'production',
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
                            },
                        ]
                    },
                    {
                        test: /\.js$/,
                        enforce: 'post',
                        exclude: [/tests\.js$/, /(node_modules)\//, /tests\.webpack\.js$/],
                        loader: 'istanbul-instrumenter-loader'
                    }
                ]
            }
        },
        webpackServer: {
            noInfo: true
        },
        coverageIstanbulReporter: {

            // reports can be any that are listed here: https://github.com/istanbuljs/istanbul-reports/tree/590e6b0089f67b723a1fdf57bc7ccc080ff189d7/lib
            reports: ['html', 'lcovonly', 'text-summary'],

            // base output directory. If you include %browser% in the path it will be replaced with the karma browser name
            dir: 'tests/coverage/',

            // if using webpack and pre-loaders, work around webpack breaking the source path
            fixWebpackSourcePaths: true,

            // stop istanbul outputting messages like `File [${filename}] ignored, nothing could be mapped`
            skipFilesWithNoCoverage: true,

            // Most reporters accept additional config options. You can pass these through the `report-config` option
            'report-config': {

                // all options available at: https://github.com/istanbuljs/istanbul-reports/blob/590e6b0089f67b723a1fdf57bc7ccc080ff189d7/lib/html/index.js#L135-L137
                html: {
                    // outputs the report in ./coverage/html
                    subdir: 'html'
                }

            },

            // enforce percentage thresholds
            // anything under these percentages will cause karma to fail with an exit code of 1 if not running in watch mode
            thresholds: {
                emitWarning: false, // set to `true` to not fail the test command when thresholds are not met
                global: { // thresholds for all files
                    statements: 83,
                    branches: 73,
                    functions: 90,
                    lines: 82
                }//,
                //each: { // thresholds per file
                //    statements: 100,
                //    lines: 100,
                //    branches: 100,
                //    functions: 100
                //}
            }

        },
    });
};
