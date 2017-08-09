import pkg from './package.json';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';
import license from 'rollup-plugin-license';

const defaults = {
    entry: 'src/statful.js',
    moduleName: 'statful',
    plugins: [
        babel(),
        license({
            sourceMap: true,
            banner: pkg.banner
        }),
    ],
};

export default [
    // Browser friendly with UMD build
    Object.assign({}, defaults, {
        dest: pkg.browser,
        format: 'umd',
    }),

    // Browser friendly with UMD build minified
    Object.assign({}, defaults, {
        dest: 'dist/statful.umd.min.js',
        format: 'umd',
        plugins: [uglify()].concat(defaults.plugins)
    }),

    // Browser not so friendly with global variable
    Object.assign({}, defaults, {
        dest: pkg.main,
        format: 'iife',
    }),

    // Browser not so friendly with global variable minified
    Object.assign({}, defaults, {
        dest: 'dist/statful.min.js',
        format: 'iife',
        plugins: [uglify()].concat(defaults.plugins)
    }),
];
