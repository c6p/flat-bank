import { readJSON } from 'https://deno.land/x/flat/mod.ts'

const filename = Deno.args[0]
const kur = (await readJSON(filename))?.result

const zaman = Math.floor(new Date().getTime() / 1000)
const url = 'https://www.cepteteb.com.tr/services/GetGunlukAltinKur'
const resp = await fetch(url)
const altin = (await resp.json())?.result.filter(d => d.miktarBirim === "GR").map(d => Object.assign(d, { paraKodu: "XAU", tebAlis: d.alisFiyat, tebSatis: d.satisFiyat }))
const data = [...kur, ...altin]

const file = await Deno.open("teb.csv", { append: true });
for (const kur of data) {
  const { paraKodu, tebAlis, tebSatis } = kur
  const str = `${zaman},${paraKodu},${tebAlis},${tebSatis}\n`
  await file.write(new TextEncoder().encode(str))
}
file.close();
await Deno.remove(filename)