const puppeteer = require("puppeteer");
const pixelmatch = require("pixelmatch");
const fs = require("fs");
const dayjs = require("dayjs");
const PNG = require("pngjs").PNG;
const chalk = require("chalk");
const log = console.log;
const config = require("./config");

(async () => {
  const date = dayjs().format("YYYY_MM_DD__HH-mm-ss");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport(config.viewport);

  log(chalk.blue("\nGenerating images for your URLs..."));

  for (let i = 0; i < config.urls.length; i++) {
    fs.mkdirSync(`screenshots/${date}/${i}`, { recursive: true });

    const url = config.urls[i];
    log(
      `- Making screenshots of ${chalk.green(url.a)} and ${chalk.green(url.b)}`
    );

    // Generate screenshots of the A and B URLs
    await page.goto(url.a);

    // Load in any custom CSS that we have defined
    await page.evaluate((url) => {
      let style = document.createElement("style");
      style.type = "text/css";
      style.innerHTML = url.css;
      document.getElementsByTagName("head")[0].appendChild(style);
    }, url);

    await page.screenshot({
      path: `screenshots/${date}/${i}/a.png`,
    });

    await page.goto(url.b);

    // Load in any custom CSS that we have defined
    await page.evaluate((url) => {
      let style = document.createElement("style");
      style.type = "text/css";
      style.innerHTML = url.css;
      document.getElementsByTagName("head")[0].appendChild(style);
    }, url);

    await page.screenshot({
      path: `screenshots/${date}/${i}/b.png`,
    });
  }

  // All done with Puppeteer so let's quit it
  await browser.close();

  /**
   * Generate diffs for each captured image
   */
  log(chalk.blue("\nGenerating diffs..."));

  // Append data to a CSV file
  fs.appendFileSync(
    `screenshots/${date}/audit.csv`,
    `URL A, URL B, Path to diff file, # of pixels difference, Notes\n`
  );

  for (let i = 0; i < config.urls.length; i++) {
    const url = config.urls[i];

    const img1 = PNG.sync.read(
      fs.readFileSync(`screenshots/${date}/${i}/a.png`)
    );

    const img2 = PNG.sync.read(
      fs.readFileSync(`screenshots/${date}/${i}/b.png`)
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
      log(chalk.red(`\t- File: screenshots/${date}/${i}/diff.png`));

      // Append data to a CSV file
      fs.appendFileSync(
        `screenshots/${date}/audit.csv`,
        `${url.a},${url.b},${i}/diff.png,${diffAmount},""\n`
      );
    }

    fs.writeFileSync(`screenshots/${date}/${i}/diff.png`, PNG.sync.write(diff));
  }
})();
