// Copy me to the root as config.js for setting your testing options

module.exports = {
  // The viewport to use when creating images from the URLs
  viewport: {
    width: 1280,
    height: 800,
  },

  // Matching threshold, ranges from 0 to 1. Smaller values make the comparison more sensitive. 0.1 by default.
  // See pixelmatch for more information: https://github.com/mapbox/pixelmatch#api
  diffThreshold: 0.1,

  // The number of pixels in the diff that, once reached, will be flagged in the audit during the testing
  nonacceptableDiff: 10,

  // The URLs to test for visual differences
  urls: [
    {
      // The first URL to test
      a: "https://time.is/Los_Angeles",

      // The URL to compare the first test to
      b: "https://time.is/New_York",

      // Need to pass in some custom CSS to your test so you can hide or change elements?
      // Provide as much CSS you need and it will be applied when navigating to the URLs
      css: ``,
    },
  ],
};
