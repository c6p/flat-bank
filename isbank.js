import { format } from "https://deno.land/std@0.222.1/datetime/mod.ts";

const filename = Deno.args[0]
Deno.remove(filename)

const date = new Date()
const time = date.getTime()
const tarih = format(date, "yyyy-M-d")
const zaman = Math.floor(time / 1000)
const url = `https://www.isbank.com.tr/_vti_bin/DV.Isbank/PriceAndRate/PriceAndRateService.svc/GetFxRates?Lang=tr&fxRateType=IB&date=${tarih}&time=${time}`
const resp = await fetch(url)
const data = await resp.json()

const file = await Deno.open("isbank.csv", { append: true });
for (const kur of data.Data) {
  const { code, fxRateBuy, fxRateSell } = kur
  const str = `${zaman},${code},${fxRateBuy},${fxRateSell}\n`
  await file.write(new TextEncoder().encode(str));
}
file.close();