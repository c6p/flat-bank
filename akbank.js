import { readJSON } from 'https://deno.land/x/flat/mod.ts'
import { parse } from "https://deno.land/std@0.222.1/datetime/parse.ts";

const filename = Deno.args[0]
const data = await readJSON(filename)

const { cur, date } = JSON.parse(data.GetCurrencyRatesResult)
const file = await Deno.open("akbank.csv", { append: true });
for (const kur of cur) {
  const zaman = Math.floor(parse(date, "dd.MM.yyyy HH:mm:ss").getTime() / 1000);
  const { Title, DovizAlis, DovizSatis, USDCaprazKur, KurTuru } = kur
  const str = `${zaman},${Title},${DovizAlis},${DovizSatis},${USDCaprazKur},${KurTuru}\n`
  await file.write(new TextEncoder().encode(str));
}
file.close();
