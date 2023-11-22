import CopyWebpackPlugin from 'copy-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import { fileURLToPath } from 'url';
import path from 'path';
import { RuntimeTypeInspectorPlugin } from '@runtime-type-inspector/plugin-webpack5';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build a target that webpack is supposed to build.
 *
 * @param {'release'|'rti'} buildType - The build type.
 * @param {'es5'|'es6'} moduleFormat - The module format.
 * @returns {import('webpack').Configuration} One webpack target.
 */
function buildTarget(buildType, moduleFormat) {
    let entry;
    if (buildType === 'release') {
        entry = {
            // include dist in entry point so that when running dev server,
            // we can access the files with /dist/...
            'dist/transformers': './src/transformers.js',
            'dist/transformers.min': './src/transformers.js',
        };
    } else {
        entry = {
            'dist/transformers.rti': './src/transformers.js',
        };
    }
    return {
        mode: 'development',
        devtool: 'source-map',
        entry,
        output: {
            filename: '[name].js',
            path: __dirname,
            library: {
                type: 'module',
            },
        },
        plugins: [
            // Copy .wasm files to dist folder
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'node_modules/onnxruntime-web/dist/*.wasm',
                        to: 'dist/[name][ext]'
                    },
                ],
            }),
            buildType === 'rti' &&
            new RuntimeTypeInspectorPlugin(
                /*{
                test: /\.[cm]?js(\?.*)?$/i,
                exts: ['js'],
                values: {
                    _HELLO: "TEST"
                }
            }*/),
        ],
        optimization: {
            minimize: buildType === 'release',
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
            outputModule: true,
        },
    };
}
export default [
    buildTarget('release', 'es6'),
    buildTarget('rti', 'es6'),
];
