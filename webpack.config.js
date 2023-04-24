import webpack from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
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
        library: {
            type: 'module',
        },
    },
    plugins: [
        // Do not include node modules when bundling for the browser
        new webpack.IgnorePlugin({
            // NOTE: We do not ignore `onnxruntime-node` because it's
            // already ignored by the `browser` option in in package.json
            resourceRegExp: /^node:/
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
    experiments: {
        topLevelAwait: true,
        outputModule: true,
    },
};
