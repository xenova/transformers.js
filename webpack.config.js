import CopyWebpackPlugin from 'copy-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Helper function to create webpack configurations.
 * @param {Object} options Options for creating a webpack target.
 * @param {string} options.name Name of output file.
 * @param {string} options.suffix Suffix of output file.
 * @param {string} options.format Format of output file.
 * @param {string} options.type Type of library.
 * @param {string} options.dynamicImportMode Dynamic import mode. 
 * @returns {import('webpack').Configuration} One webpack target.
 */
function buildConfig({
    name = '',
    suffix = '.js',
    type = 'module',               // 'module' | 'commonjs'
    ignoreModules = [], // 'eager' | undefined
} = {}) {
    const outputModule = type === 'module';

    const alias = Object.fromEntries(ignoreModules.map((module) => {
        return [module, false];
    }));

    return {
        mode: 'development',
        devtool: 'source-map',
        entry: {
            // include dist in entry point so that when running dev server,
            // we can access the files with /dist/...
            [`dist/transformers${name}`]: './src/transformers.js',
            [`dist/transformers${name}.min`]: './src/transformers.js',
        },
        output: {
            filename: `[name]${suffix}`,
            path: __dirname,
            library: {
                type,
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
        ],
        optimization: {
            minimize: true,
            minimizer: [new TerserPlugin({
                test: new RegExp(`\\.min\\${suffix}$`),
                extractComments: false,
            })],
        },
        experiments: {
            outputModule,
        },
        resolve: { alias },

        // Development server
        devServer: {
            static: {
                directory: __dirname
            },
            port: 8080
        },
    };
}


export default [
    buildConfig({
        type: 'module',
    }),
    buildConfig({
        suffix: '.cjs',
        type: 'commonjs',
        ignoreModules: ['onnxruntime-web', 'onnxruntime-web/webgpu'],
    }),
];
