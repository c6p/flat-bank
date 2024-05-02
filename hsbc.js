import { readJSON } from 'https://deno.land/x/flat/mod.ts'

const zaman = Math.floor(new Date().getTime() / 1000)
const file = await Deno.open("hsbc.csv", { append: true });

// https://www.hsbcyatirim.com.tr/api/hsbcdata/getForeignCurrencies
const filename = Deno.args[0]
let data = await readJSON(filename)
for (const { Symbol, HsbcBuy, HsbcSell } of data) {
  const str = `${zaman},${Symbol},${HsbcBuy},${HsbcSell}\n`
  await file.write(new TextEncoder().encode(str));
}

const url = "https://www.hsbcyatirim.com.tr/api/hsbcdata/getGoldData"
data = await (await fetch(url)).json()
const symbols = new Set(["XAUKG", "XAG", "XPD", "XPT"])
for (const { Symbol, Buy, Sell } of data.filter(({ Symbol }) => symbols.has(Symbol))) {
  const str = `${zaman},${Symbol.substring(0, 3)},${Buy},${Sell}\n`
  await file.write(new TextEncoder().encode(str));
}

file.close();
Deno.remove(filename)