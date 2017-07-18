module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        eslint: {
            js: {
                src: [
                  'src/**/*.js',
                  'tests/*.tests.js',
                ]
            }
        },

        clean: {
            dist: 'dist/*'
        },

        uglify: {
            dist: {
                options: {
                    mangle: true,
                    banner: grunt.file.readJSON('package.json').banner,
                    compress: true,
                    quoteStyle: 1
                },
                files: {
                    'dist/statful.min.js': [
                        'src/*.js',
                        'bower_components/usertiming/src/usertiming.js',
                        'bower_components/js-polyfills/es5.js'
                    ]
                }
            },
            debug: {
                options: {
                    mangle: false,
                    beautify: true,
                    compress: false,
                    preserveComments: true,
                    banner: grunt.file.readJSON('package.json').banner
                },
                files: {
                    'dist/statful.js': [
                        'src/*.js',
                        'bower_components/usertiming/src/usertiming.js',
                        'bower_components/js-polyfills/es5.js'
                    ]
                }
            }
        },

        karma: {
            unit: {
                configFile: 'karma.conf.js',
                singleRun: true,
                client: {
                    captureConsole: false
                }
            }
        }
    });

    grunt.registerTask('test', [
        'eslint',
        'karma'
    ]);

    grunt.registerTask('default', [
        'clean',
        'test',
        'uglify'
    ]);
};
