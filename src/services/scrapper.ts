import request from "request";
import cheerio from "cheerio";
import stopwords from "../data/stopwords.json";

const defaultStopwords = stopwords.words;

export async function getFullPage(url: string) {
  return new Promise((resolve, reject) => {
    request.get(url, { timeout: 2000 }, async (error: any, response: any, body: any) => {
      if (error) {
        resolve({
          body: ""
        });
        return;
      }
      const $ = cheerio.load(body);
      const result = getBody($);
      const res = {
        body: result,
      }
      resolve(res);
    });
  });
}

function getBody($: cheerio.Root): string {
  const body = $("body").text().replace(/(\r\n|\n|\r)/gm, "").replace(/\s+/g, ' ');
  const res = body
      .match(/[a-zA-ZÀ-ÖØ-öø-ÿ]+/g)?.filter(word => {
        return !(word.length < 2 || word.match(/^\d/))
      }).map(word => word.toLowerCase())
      .filter(t => !defaultStopwords.includes(t))
  return res?.join(" ") || "";
}
