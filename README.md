# 🖼  Visual Diff Tool

## A Node-based auditing tool to visually diff pages

## Getting Started
1. Download the project
2. Install dependencies `npm i`
3. Copy `config.example.js` to `config.js`
4. Modify your `config.js` values and supply your array of URLs to test
5. Run `node index.js` to create screenshots, diffs and generate an audit.csv file of what's different

## Config

All of the config values you can specify for your test:
```js
module.exports = {
  // The viewport to use when creating images from the URLs
  viewport: {
    width: 1500,
    height: 1500,
  },

  // Matching threshold, ranges from 0 to 1. Smaller values make the comparison more sensitive. 0.1 by default.
  // See pixelmatch for more information: https://github.com/mapbox/pixelmatch#api
  diffThreshold: 0.1,

  // The number of pixels in the diff that, once reached, will display a warning in the console during the testing
  nonacceptableDiff: 10,

  // The URLs to test for visual differences
  urls: [
    {
      a: "https://google.com",
      b: "https://yahoo.com",
      css: ``,
    },
  ],
};

```
