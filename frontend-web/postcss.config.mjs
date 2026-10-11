// A custom PostCSS config replaces Next's defaults; targets are evergreen browsers, so only
// custom media is compiled. Breakpoints are injected into every file, then stripped.
export default {
  plugins: {
    '@csstools/postcss-global-data': { files: ['./src/styles/tokens/breakpoints.css'] },
    'postcss-custom-media': {},
  },
};
