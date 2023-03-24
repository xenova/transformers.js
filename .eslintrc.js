module.exports = {
    env: { es2020: true, node: true, browser: true },
    parserOptions: { ecmaVersion: 2022 },
    extends: [
        'eslint:recommended',
        'prettier',
        'plugin:prettier/recommended', // should always be at the end
    ],
    ignorePatterns: [
        '**/assets/**',
        '**/dist/**',
        '**/node_modules/**',
        '**/modules/**',
        'index.html',
        '**/scripts/**',
    ],
    plugins: ['prettier', 'simple-import-sort'],
    root: true,
    rules: {
        curly: ['error', 'multi-line'],
        'simple-import-sort/exports': 'error',
        'simple-import-sort/imports': 'error',
        eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
};
