import { readJSON } from 'https://deno.land/x/flat/mod.ts'

const zaman = Math.floor(new Date().getTime() / 1000)
const file = await Deno.open("kuveytturk.csv", { append: true });

// https://www.kuveytturk.com.tr/ck0d84?B83A1EF44DD940F2FEC85646BDB25EA0
const filename = Deno.args[0]
let data = await readJSON(filename)
const filterOut = new Set(["TL", "CAG (gr)", "Çeyrek", "EUR/USD"])
const replace = { "ALT": "XAU", "GMS": "XAG" }
for (const { Title, BuyRate, SellRate } of data.filter(({ Title }) => !filterOut.has(Title))) {
  const t = Title.substring(0, 3)
  const title = replace[t] ?? t
  const [buy, sell] = [BuyRate, SellRate].map(v => v.replace('.', '').replace(',', '.'))
  const str = `${zaman},${title},${buy},${sell}\n`
  await file.write(new TextEncoder().encode(str));
}

file.close();
Deno.remove(filename)