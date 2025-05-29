const puppeteer = require("puppeteer");

async function scrapePremiereFilms() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
  );

  await page.goto("https://www.premiere.fr/Cinema/Sorties", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForSelector(".m-title a");

  const films = await page.evaluate(() => {
    const elements = document.querySelectorAll(".m-title a");
    const data = [];
    elements.forEach((el) => {
      const title = el.textContent?.trim();
      if (title) {
        data.push({ title });
      }
    });
    return data;
  });

  await browser.close();
  return films;
}

scrapePremiereFilms()
  .then((films) => {
    console.log("Films extraits depuis Première :");
    console.table(films);
  })
  .catch((err) => {
    console.error("Erreur scraping Première:", err);
  });
