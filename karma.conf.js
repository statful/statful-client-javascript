module.exports = function(config) {
    'use strict';

    config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['jasmine'],
        //
        // list of files / patterns to load in the browser (order matters)
        files: [
            { pattern: require.resolve('usertiming'), include: false },
            { pattern: require.resolve('jasmine-ajax'), include: true },
            { pattern: 'node_modules/babel-polyfill/browser.js', instrument: false},
            { pattern: 'tests/*.tests.js', included: true }
        ],

        // list of files to exclude
        exclude: [],

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress', 'coverage'],

        preprocessors: {
            // source files, that you wanna generate coverage for
            // do not include tests or libraries
            // (these files will be instrumented by Istanbul)
            'tests/*.tests.js': ['rollup']
        },

        rollupPreprocessor: {
            plugins: [
                require('rollup-plugin-istanbul')({
                    exclude: [
                        'tests/*.js',
                        'node_modules/usertiming/src/usertiming.js'
                    ]
                }),
                require('rollup-plugin-node-resolve')(),
                require('rollup-plugin-babel')()
            ],
            format: 'iife', // Helps prevent naming collisions.
            moduleName: 'statful', // Required for 'iife' format.
            sourceMap: 'inline' // Sensible for testing.
        },
        coverageReporter: {
            reporters: [
                {
                    type: 'text-summary'
                },
                {
                    type: 'html',
                    dir: 'tests/coverage/'
                }
            ]
        },

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['PhantomJS']
    });
};
