import path from 'path';

export default {
    // config options
    root: path.join(__dirname, 'src'),
    build: {
        outDir: path.join(__dirname, 'dist')
    },
    publicDir: path.join(__dirname, 'public'),
}