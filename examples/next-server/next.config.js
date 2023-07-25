/** @type {import('next').NextConfig} */
const nextConfig = {
    // Indicate that these packages should not be bundled by webpack
    experimental: {
        serverComponentsExternalPackages: ['sharp', 'onnxruntime-node'],
    },
};

module.exports = nextConfig;
