const { Cluster } = require("puppeteer-cluster");
const pixelmatch = require("pixelmatch");
const fs = require("fs");
const dayjs = require("dayjs");
const PNG = require("pngjs").PNG;
const chalk = require("chalk");
const log = console.log;
const config = require("./config");

(async () => {
  const date = dayjs().format("YYYY_MM_DD__HH-mm-ss");

  // Setup the batch jobs for Puppeteer crawling
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: config.maxConcurrency,
  });

  // We don't define a task and instead use own functions
  const screenshot = async ({ page, data }) => {
    log(`- Getting a screenshot of ${chalk.green(data.url)}`);

    // Create the directory for the given image
    fs.mkdirSync(`screenshots/${date}/${data.item}`, { recursive: true });

    // Generate screenshots of the A and B URLs
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
  };

  log(chalk.blue("\nGenerating images for your URLs..."));

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

  /**
   * Generate diffs for each captured image
   */
  log(chalk.blue("\nGenerating diffs..."));

  // Append data to a CSV file
  fs.appendFileSync(
    `screenshots/${date}/audit.csv`,
    `URL A, URL B, Path to diff file, # of pixels difference, Status, Notes\n`
  );

  for (let i = 0; i < config.urls.length; i++) {
    const url = config.urls[i];

    const img1 = PNG.sync.read(
      fs.readFileSync(`screenshots/${date}/${i + 1}/a.png`)
    );

    const img2 = PNG.sync.read(
      fs.readFileSync(`screenshots/${date}/${i + 1}/b.png`)
    );

    const { width, height } = img1;
    const diff = new PNG({ width, height });

    log(`- Creating a diff of ${chalk.green(url.a)} and ${chalk.green(url.b)}`);

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
      log(
        chalk.red(
          `\t- WARNING! It appears there's a non-trivial difference from this test!`
        )
      );
      log(chalk.red(`\t- File: screenshots/${date}/${i + 1}/diff.png`));
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
  }

  log(chalk.green(`\n🎉 Audit complete!`));
  log(
    `- You can view a summary of non-trivial differences in ${chalk.green(
      `screenshots/${date}/audit.csv`
    )}`
  );
})();
