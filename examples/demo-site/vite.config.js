import path from 'path';

// Needed for deploying to GitHub pages
const BASE_PATH = process.env.BASE_PATH ?? '';

export default {
    // config options
    base: BASE_PATH,
    root: path.join(__dirname, 'src'),
    build: {
        outDir: path.join(__dirname, 'dist')
    },
    publicDir: path.join(__dirname, 'public'),
}