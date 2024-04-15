import { readJSON, open } from 'https://deno.land/x/flat/mod.ts'

const filename = Deno.args[0]
const data = await readJSON(filename)

const { cur, date } = data.GetCurrencyRatesResult
const file = await open("akbank.csv", { append: true });
for (kur of cur) {
  const zaman = Math.floor(new Date(date).getTime() / 1000);
  const { Title, DovizAlis, DovizSatis, USDCaprazKur, KurTuru } = kur
  const str = `${zaman},${Title},${DovizAlis},${DovizSatis},${USDCaprazKur},${KurTuru}\n`
  await file.write(new TextEncoder().encode(str));
}
file.close();
