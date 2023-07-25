/** @type {import('next').NextConfig} */
const nextConfig = {
    // Export as a static site
    output: 'export',

    // Override the default webpack configuration
    webpack: (config) => {
        // Ignore node-specific modules when bundling for the browser
        // https://webpack.js.org/configuration/resolve/#resolvealias
        config.resolve.alias = {
            ...config.resolve.alias,
            "sharp$": false,
            "onnxruntime-node$": false,
        }
        return config;
    },
};

module.exports = nextConfig;
