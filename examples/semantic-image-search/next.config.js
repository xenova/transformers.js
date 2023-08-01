/** @type {import('next').NextConfig} */
const nextConfig = {
    // (Optional) Export as a standalone site
    // See https://nextjs.org/docs/pages/api-reference/next-config-js/output#automatically-copying-traced-files
    output: 'standalone', // Feel free to modify/remove this option

    // Indicate that these packages should not be bundled by webpack
    experimental: {
        serverComponentsExternalPackages: ['sharp', 'onnxruntime-node'],
    },

    // Define which domains we are allowed to load images from
    images: {
        domains: ['images.unsplash.com'],
    },
};

module.exports = nextConfig;
