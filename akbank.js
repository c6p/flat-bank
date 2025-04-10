import { readJSON } from 'https://deno.land/x/flat/mod.ts'
import { parse } from "https://deno.land/std@0.222.1/datetime/parse.ts";

const TIME_OFFSET = 3

const filename = Deno.args[0]
const data = await readJSON(filename)

const { DovizKurlari, KurGuncellemeZamani } = data.d.Data
const file = await Deno.open("akbank.csv", { append: true });
for (const kur of DovizKurlari) {
  const tarih = parse(KurGuncellemeZamani, "dd.MM.yyyy HH:mm:ss")
  tarih.setHours(tarih.getHours() - TIME_OFFSET)
  const zaman = Math.floor(tarih.getTime() / 1000);
  const { AlfaKod, DovizAlis, DovizSatis } = kur
  const str = `${zaman},${AlfaKod},${DovizAlis},${DovizSatis}\n`
  await file.write(new TextEncoder().encode(str));
}
file.close();
await Deno.remove(filename)