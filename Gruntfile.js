module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        options: {
            configFile: 'eslint.json'
        },

        eslint: {
            options: {
                configFile: 'eslint.json'
            },
            js: {
                src: ['src/**/*.js']
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
                        'bower_components/js-polyfills/es5.js',
                        'bower_components/js-polyfills/xhr.js'
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
                        'bower_components/js-polyfills/es5.js',
                        'bower_components/js-polyfills/xhr.js'
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
        },

        watch: {
            scripts: {
                files: ['src/*.js', 'tests/*.js'],
                tasks: ['test']
            }
        },

        bump: {
            options: {
                files: ['package.json', 'bower.json'],
                updateConfigs: [],
                commit: true,
                commitMessage: 'Release v%VERSION%',
                commitFiles: ['package.json', 'bower.json', 'dist/statful.js', 'dist/statful.min.js'],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: true,
                pushTo: 'origin',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
                globalReplace: false,
                prereleaseName: false,
                regExp: false
            }
        }
    });

    grunt.registerTask('dev', [
        'watch'
    ]);

    grunt.registerTask('test', [
        'eslint',
        'karma'
    ]);

    grunt.registerTask('default', [
        'clean',
        'eslint',
        'karma',
        'uglify'
    ]);

    grunt.registerTask('release', [
        'default',
        'bump'
    ]);
};
