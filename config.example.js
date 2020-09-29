// Copy me to the root as config.js for setting your testing options

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
