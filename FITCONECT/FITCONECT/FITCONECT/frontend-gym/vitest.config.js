module.exports = {
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/setupTests.jsx',
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['src/App.test.js', 'node_modules']
  }
};
