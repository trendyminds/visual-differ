const { Cluster } = require("puppeteer-cluster");
const pixelmatch = require("pixelmatch");
const fs = require("fs");
const dayjs = require("dayjs");
const path = require('node:path');
const PNG = require("pngjs").PNG;
const chalk = require("chalk");
const cliProgress = require("cli-progress");
const log = console.log;
const config = require("./config");

// Setup our progress bars
const screenshotProgress = new cliProgress.SingleBar(
  {},
  cliProgress.Presets.rect
);

const diffProgress = new cliProgress.SingleBar({}, cliProgress.Presets.rect);

// Create a timestamp for file and folder names
const date = dayjs().format("YYYY_MM_DD__HH-mm-ss");

(async () => {
  // Setup the batch jobs for Puppeteer crawling
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: config.maxConcurrency,
  });

  // We don't define a task and instead use own functions
  const screenshot = async ({ page, data }) => {
    // Create the directory for the given image
    fs.mkdirSync(`screenshots/${date}/${data.item}`, { recursive: true });

    // Generate screenshots of the A and B URLs using our specified viewport size
    await page.setViewport(config.viewport);
    await page.goto(data.url);

    // Load in any custom CSS that we have defined
    await page.evaluate((data) => {
      let style = document.createElement("style");
      style.innerHTML = data.css;
      document.getElementsByTagName("head")[0].appendChild(style);
    }, data);

    await page.screenshot({
      path: `screenshots/${date}/${data.item}/${data.test}.png`,
    });

    // Update the progress
    screenshotProgress.increment();
  };

  // Initiate the progress bar
  log(chalk.blue("\nGenerating images from your URLs..."));
  screenshotProgress.start(config.urls.length * 2, 0);

  // Add each page in our settings to a queue
  config.urls.forEach((data, i) => {
    // Add the "A" test to our queue
    cluster.queue(
      { url: data.a, css: data.css, test: "a", item: i + 1 },
      screenshot
    );

    // Add the "B" test to our queue
    cluster.queue(
      { url: data.b, css: data.css, test: "b", item: i + 1 },
      screenshot
    );
  });

  await cluster.idle();
  await cluster.close();

  // Stop the progress bar
  screenshotProgress.stop();

  /**
   * Generate diffs for each captured image
   */
  log(chalk.blue("\nDiffing images and creating report..."));
  diffProgress.start(config.urls.length, 0);

  // Append data to a CSV file
  fs.appendFileSync(
    `screenshots/${date}/audit.csv`,
    `URL A, URL B, Path to diff file, # of pixels difference, Status, Notes\n`
  );

  // Create an array that holds the pages that have non-acceptable differences
  let nonacceptableDiffs = [];

  for (let i = 0; i < config.urls.length; i++) {
    const url = config.urls[i];

    const img1 = PNG.sync.read(
      fs.readFileSync(path.normalize(`screenshots/${date}/${i + 1}/a.png`))
    );

    const img2 = PNG.sync.read(
      fs.readFileSync(path.normalize(`screenshots/${date}/${i + 1}/b.png`))
    );

    const { width, height } = img1;
    const diff = new PNG({ width, height });

    const diffAmount = pixelmatch(
      img1.data,
      img2.data,
      diff.data,
      width,
      height,
      {
        threshold: config.diffThreshold,
      }
    );

    if (diffAmount >= config.nonacceptableDiff) {
      nonacceptableDiffs.push(`screenshots/${date}/${i + 1}/diff.png`);
    }

    // Append data to a CSV file
    fs.appendFileSync(
      `screenshots/${date}/audit.csv`,
      `${url.a},${url.b},${i + 1}/diff.png,${diffAmount},${
        diffAmount <= config.nonacceptableDiff ? "Pass" : "Fail"
      },""\n`
    );

    fs.writeFileSync(
      `screenshots/${date}/${i + 1}/diff.png`,
      PNG.sync.write(diff)
    );

    // Update the progress
    diffProgress.increment();
  }

  // Exit progress bar
  diffProgress.stop();

  log(
    `\n\n⚠️  A total of ${nonacceptableDiffs.length} page(s) had non-acceptable differences.`
  );
  nonacceptableDiffs.forEach((diff) => {
    log(chalk.red(`- ${diff}`));
  });

  log(`\n\n🎉 Audit complete!`);
  log(
    `You can view a full report of this audit at ${chalk.green(
      `screenshots/${date}/audit.csv`
    )}`
  );
})();
