const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    mode: 'development',
    devtool: 'source-map',
    entry: {
        // include dist in entry point so that when running dev server,
        // we can access the files with /dist/...
        'dist/transformers': './src/transformers.js',
        'dist/transformers.min': './src/transformers.js',
    },
    output: {
        filename: '[name].js',
        path: __dirname,
    },
    plugins: [
        // Do not include node modules when bundling for the browser
        new webpack.IgnorePlugin({
            resourceRegExp: /^onnxruntime-node$|^node:/
        }),

        // Copy .wasm files to dist folder
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'node_modules/onnxruntime-web/dist/*.wasm',
                    to: 'dist/[name][ext]'
                },
            ],
        }),
    ],
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({
            test: /\.min\.js$/,
            extractComments: false,
        })],
    },
    devServer: {
        static: {
            directory: __dirname
        },
        port: 8080
    },
};
