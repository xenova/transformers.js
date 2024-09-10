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
 * @returns {import('webpack').Configuration} One webpack target.
 */
function buildTarget(buildType) {
    let entry = {
        // include dist in entry point so that when running dev server,
        // we can access the files with /dist/...
        'dist/transformers': './src/transformers.js',
        'dist/transformers.min': './src/transformers.js',
    };
    let plugins = [
        // Copy .wasm files to dist folder
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'node_modules/onnxruntime-web/dist/*.wasm',
                    to: 'dist/[name][ext]'
                },
            ],
        })
    ];
    let devtool = 'source-map';
    if (buildType === 'rti') {
        entry = {
            'dist/transformers.rti': './src/transformers.rti.js',
        };
        plugins = [
            new RuntimeTypeInspectorPlugin()
        ];
        devtool = false;
    }
    return {
        mode: 'development',
        devtool,
        entry,
        output: {
            filename: '[name].js',
            path: __dirname,
            library: {
                type: 'module',
            },
        },
        plugins,
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
    buildTarget('release'),
    buildTarget('rti'),
];
