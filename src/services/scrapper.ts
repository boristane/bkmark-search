import request from "request";
import cheerio from "cheerio";

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
  const a = $("body").text().replace(/(\r\n|\n|\r)/gm, "").replace(/\s+/g, ' ');
  console.log(a);
  return a;
}
