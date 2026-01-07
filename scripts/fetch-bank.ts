import { parse, format } from "https://deno.land/std@0.222.1/datetime/mod.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { ensureDir } from "https://deno.land/std@0.222.1/fs/mod.ts";

const TIME_OFFSET = 3;

// Simple JSON reader utility (replacement for flat's readJSON)
async function readJSON(filename: string): Promise<any> {
  const text = await Deno.readTextFile(filename);
  return JSON.parse(text);
}

interface BankConfig {
  url: string;
  axiosConfig?: any;
  downloadedFilename: string;
  processor: (filename: string) => Promise<void>;
}

// Bank configurations
const BANK_CONFIGS: Record<string, BankConfig> = {
  akbank: {
    url: "https://www.akbank.com/_layouts/15/Akbank/CalcTools/Ajax.aspx/GetDovizKurlari",
    axiosConfig: {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": 0
      },
      method: "post",
      data: {
        kurTuru: "8"
      }
    },
    downloadedFilename: "akbank-current.json",
    processor: async (filename: string) => {
      const data = await readJSON(filename);
      const { DovizKurlari, KurGuncellemeZamani } = data.d.Data;
      const file = await Deno.open("akbank.csv", { append: true });
      for (const kur of DovizKurlari) {
        const tarih = parse(KurGuncellemeZamani, "dd.MM.yyyy HH:mm:ss");
        tarih.setHours(tarih.getHours() - TIME_OFFSET);
        const zaman = Math.floor(tarih.getTime() / 1000);
        const { AlfaKod, DovizAlis, DovizSatis } = kur;
        const str = `${zaman},${AlfaKod},${DovizAlis},${DovizSatis}\n`;
        await file.write(new TextEncoder().encode(str));
      }
      file.close();
      await Deno.remove(filename);
    }
  },

  ing: {
    url: "https://www.ing.com.tr/ProxyManagement/SiteManagerService_Script.aspx/GetCurrencyRates",
    downloadedFilename: "ing-current.json",
    processor: async (filename: string) => {
      await Deno.remove(filename);
      const now = new Date();
      const zaman = Math.floor(now.getTime() / 1000);
      const date = now.toISOString();
      const url = "https://www.ing.com.tr/ProxyManagement/SiteManagerService_Script.aspx/GetCurrencyRates";
      const options = { body: JSON.stringify({ date }), method: "POST", headers: { "Content-Type": "application/json" } };
      const resp = await fetch(url, options);
      const data = await resp.json();
      const file = await Deno.open("ing.csv", { append: true });
      for (const kur of data.d) {
        const { CurrencySymbol, BuyingExchangeRate, SellingExchangeRate } = kur;
        const str = `${zaman},${CurrencySymbol},${BuyingExchangeRate},${SellingExchangeRate}\n`;
        await file.write(new TextEncoder().encode(str));
      }
      file.close();
    }
  },

  garanti: {
    url: "https://www.ing.com.tr/ProxyManagement/SiteManagerService_Script.aspx/GetCurrencyRates",
    downloadedFilename: "garanti-current.json",
    processor: async (filename: string) => {
      await Deno.remove(filename);
      const data = await (await fetch("https://customers.garantibbva.com.tr/internet/digitalpublic/currency-convertor-public/v1/currency-convertor/currency-list-detail", {
        "credentials": "include",
        "headers": {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "channel": "Internet",
          "ip": "127.0.0.1",
          "dialect": "TR",
          "guid": "2c041ca2e9fe40bab789c7c857b56eab",
          "tenant-company-id": "GAR",
        },
        "referrer": "https://webforms.garantibbva.com.tr/",
        "method": "GET",
      })).json();

      const { currDate, currTime } = data[0];
      const date = new Date(`${currDate}T${currTime}Z`);
      date.setHours(date.getHours() - TIME_OFFSET);
      const zaman = Math.floor(date.getTime() / 1000);

      const file = await Deno.open("garanti.csv", { append: true });
      for (const { currCode, exchBuyRate, exchSellRate } of data.filter(({ currCode: s }: any) => s.substring(s.length - 3, s.length) === "/TL")) {
        const code = currCode.substring(0, 3);
        const str = `${zaman},${code === "ALT" ? "XAU" : code},${exchBuyRate},${exchSellRate}\n`;
        await file.write(new TextEncoder().encode(str));
      }
      file.close();
    }
  },

  enpara: {
    url: "https://www.qnbfinansbank.enpara.com/hesaplar/doviz-ve-altin-kurlari",
    downloadedFilename: "enpara-current.html",
    processor: async (filename: string) => {
      const html = await Deno.readTextFile(filename);
      const document = new DOMParser().parseFromString(html, "text/html");
      const zaman = Math.floor(new Date().getTime() / 1000);
      const kurlar = [["usd", "USD"], ["eur", "EUR"], ["altın", "XAU"]];
      const file = await Deno.open("enpara.csv", { append: true });
      document?.querySelectorAll("div.enpara-gold-exchange-rates__table-item").forEach(async (div: any) => {
        const spans = [...div.querySelectorAll("span")];
        const kur = kurlar.find((value) => spans[0].textContent.split(' ')[0].toLocaleLowerCase("tr") === value[0]);
        if (!kur) return;
        const [alis, satis] = spans.slice(1, 3).map((span: any) => span.textContent.split(' ')[0].replace('.', '').replace(',', '.'));
        const str = `${zaman},${kur[1]},${alis},${satis}\n`;
        await file.write(new TextEncoder().encode(str));
      });
      file.close();
      await Deno.remove(filename);
    }
  },

  teb: {
    url: "https://www.cepteteb.com.tr/services/GetGunlukDovizKur",
    downloadedFilename: "teb-current.json",
    processor: async (filename: string) => {
      const kur = (await readJSON(filename))?.result;
      const zaman = Math.floor(new Date().getTime() / 1000);
      const url = 'https://www.cepteteb.com.tr/services/GetGunlukAltinKur';
      const resp = await fetch(url);
      const altin = (await resp.json())?.result.filter((d: any) => d.miktarBirim === "GR").map((d: any) => Object.assign(d, { paraKodu: "XAU", tebAlis: d.alisFiyat, tebSatis: d.satisFiyat }));
      const data = [...kur, ...altin];
      const file = await Deno.open("teb.csv", { append: true });
      for (const kur of data) {
        const { paraKodu, tebAlis, tebSatis } = kur;
        const str = `${zaman},${paraKodu},${tebAlis},${tebSatis}\n`;
        await file.write(new TextEncoder().encode(str));
      }
      file.close();
      await Deno.remove(filename);
    }
  },

  hsbc: {
    url: "https://www.hsbcyatirim.com.tr/api/hsbcdata/getForeignCurrencies",
    downloadedFilename: "hsbc-current.json",
    processor: async (filename: string) => {
      const zaman = Math.floor(new Date().getTime() / 1000);
      const file = await Deno.open("hsbc.csv", { append: true });
      let data = await readJSON(filename);
      for (const { Symbol, HsbcBuy, HsbcSell } of data) {
        const str = `${zaman},${Symbol},${HsbcBuy},${HsbcSell}\n`;
        await file.write(new TextEncoder().encode(str));
      }
      const url = "https://www.hsbcyatirim.com.tr/api/hsbcdata/getGoldData";
      data = await (await fetch(url)).json();
      const symbols = new Set(["XAUKG", "XAG", "XPD", "XPT"]);
      for (const { Symbol, Buy, Sell } of data.filter(({ Symbol }: any) => symbols.has(Symbol))) {
        const str = `${zaman},${Symbol.substring(0, 3)},${Buy},${Sell}\n`;
        await file.write(new TextEncoder().encode(str));
      }
      file.close();
      await Deno.remove(filename);
    }
  },

  kuveytturk: {
    url: "https://www.kuveytturk.com.tr/ck0d84?B83A1EF44DD940F2FEC85646BDB25EA0",
    downloadedFilename: "kuveytturk-current.json",
    processor: async (filename: string) => {
      const zaman = Math.floor(new Date().getTime() / 1000);
      const file = await Deno.open("kuveytturk.csv", { append: true });
      let data = await readJSON(filename);
      const filterOut = new Set(["TL", "CAG (gr)", "Çeyrek", "EUR/USD"]);
      const replace: Record<string, string> = { "ALT": "XAU", "GMS": "XAG" };
      for (const { Title, BuyRate, SellRate } of data.filter(({ Title }: any) => !filterOut.has(Title))) {
        const t = Title.substring(0, 3);
        const title = replace[t] ?? t;
        const str = `${zaman},${title},${BuyRate},${SellRate}\n`;
        await file.write(new TextEncoder().encode(str));
      }
      file.close();
      await Deno.remove(filename);
    }
  },

  isbank: {
    url: "https://www.isbank.com.tr/_vti_bin/DV.Isbank/PriceAndRate/PriceAndRateService.svc/GetFxRates",
    downloadedFilename: "isbank-current.json",
    processor: async (filename: string) => {
      await Deno.remove(filename);
      const date = new Date();
      const time = date.getTime();
      const tarih = format(date, "yyyy-M-d");
      const zaman = Math.floor(time / 1000);
      const url = `https://www.isbank.com.tr/_vti_bin/DV.Isbank/PriceAndRate/PriceAndRateService.svc/GetFxRates?Lang=tr&fxRateType=IB&date=${tarih}&time=${time}`;
      const resp = await fetch(url);
      const data = await resp.json();
      const file = await Deno.open("isbank.csv", { append: true });
      for (const kur of data.Data) {
        const { code, fxRateBuy, fxRateSell } = kur;
        const str = `${zaman},${code},${fxRateBuy},${fxRateSell}\n`;
        await file.write(new TextEncoder().encode(str));
      }
      file.close();
    }
  },

  ziraat: {
    url: "https://www.ing.com.tr/ProxyManagement/SiteManagerService_Script.aspx/GetCurrencyRates",
    downloadedFilename: "ziraat-current.json",
    processor: async (filename: string) => {
      await Deno.remove(filename);
      const zaman = Math.floor(new Date().getTime() / 1000);
      const file = await Deno.open("ziraat.csv", { append: true });
      for (const [url, selector, kurName] of [
        ["https://www.ziraatbank.com.tr/tr/_layouts/15/Ziraat/FaizOranlari/Ajax.aspx/GetDovizKurlari", '[data-id="rdIntBranchDoviz"] tr', null],
        ["https://www.ziraatbank.com.tr/tr/_layouts/15/Ziraat/FaizOranlari/Ajax.aspx/GetAltinFiyatlari", '[data-id="rdIntBranchAltin"] tr:nth-child(2)', "XAU"]
      ] as const) {
        let html = (await (await fetch(url as string, {
          "headers": { "Content-Type": "core/json" },
          "body": JSON.stringify({ date: format(new Date(), "yyyy-MM-dd") }),
          "method": "POST"
        })).json())?.d?.Data;
        let document = new DOMParser().parseFromString(html || "", "text/html");
        document?.querySelectorAll(selector as string).forEach(async (tr: any) => {
          const tds = [...tr.querySelectorAll("td")];
          if (tds.length < 4) return;
          const [kur, alis, satis] = [0, 2, 3].map((i: number) => tds[i].textContent.replaceAll(",", "."));
          const str = `${zaman},${kurName ?? kur},${alis},${satis}\n`;
          await file.write(new TextEncoder().encode(str));
        });
      }
      file.close();
    }
  },

  yapikredi: {
    url: "https://www.yapikredi.com.tr/_ajaxproxy/general.aspx/LoadMainCurrencies",
    axiosConfig: {
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      data: {},
      method: "post"
    },
    downloadedFilename: "yapikredi-current.json",
    processor: async (filename: string) => {
      const data = await readJSON(filename);
      const file = await Deno.open("yapikredi.csv", { append: true });
      for (const { code, buy, sell, Date } of data.d) {
        const zaman = Date.match(/\/Date\((\d+)000\)\//)?.[1];
        const str = `${zaman},${code},${buy},${sell}\n`;
        await file.write(new TextEncoder().encode(str));
      }
      file.close();
      await Deno.remove(filename);
    }
  }
};

async function logError(bank: string, error: Error) {
  try {
    await ensureDir("logs");
    const logEntry = {
      timestamp: new Date().toISOString(),
      bank,
      error: error.message,
      stack: error.stack
    };
    const logFile = await Deno.open("logs/failures.jsonl", { append: true, create: true });
    await logFile.write(new TextEncoder().encode(JSON.stringify(logEntry) + "\n"));
    logFile.close();
  } catch (e) {
    console.error("Failed to log error:", e);
  }
}

async function fetchBank(bank: string) {
  const config = BANK_CONFIGS[bank];
  
  if (!config) {
    throw new Error(`Unknown bank: ${bank}`);
  }

  console.log(`Fetching data for ${bank}...`);

  try {
    // Fetch data
    let response: Response;
    if (config.axiosConfig) {
      const options: RequestInit = {
        method: config.axiosConfig.method || "GET",
        headers: config.axiosConfig.headers || {}
      };
      if (config.axiosConfig.data) {
        options.body = JSON.stringify(config.axiosConfig.data);
      }
      response = await fetch(config.url, options);
    } else {
      response = await fetch(config.url);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Save downloaded file
    const contentType = response.headers.get("content-type") || "";
    let data: string;
    if (contentType.includes("text/html")) {
      data = await response.text();
    } else {
      data = await response.text();
    }
    await Deno.writeTextFile(config.downloadedFilename, data);

    // Process data
    await config.processor(config.downloadedFilename);

    console.log(`✓ Successfully fetched and processed ${bank}`);
    return { success: true, bank };
  } catch (error) {
    console.error(`✗ Failed to fetch ${bank}:`, error);
    await logError(bank, error as Error);
    return { success: false, bank, error: (error as Error).message };
  }
}

// Main execution
if (import.meta.main) {
  const bankName = Deno.args[0];
  
  if (!bankName) {
    console.error("Usage: deno run --allow-all fetch-bank.ts <bank-name>");
    console.error("Available banks:", Object.keys(BANK_CONFIGS).join(", "));
    Deno.exit(1);
  }

  const result = await fetchBank(bankName);
  
  if (!result.success) {
    Deno.exit(1);
  }
}
