import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const filename = Deno.args[0]
let document = new DOMParser().parseFromString(await Deno.readTextFile(filename), "text/html")

const zaman = Math.floor(new Date().getTime() / 1000)
const file = await Deno.open("vakif.csv", { append: true });

document.querySelectorAll(".GridStyle tr:not(.sari)").forEach(async tr => {
    const tds = [...tr.querySelectorAll("td")]
    const kur = tds[0].textContent.split(' ')[0]
    const [alis, satis] = tds.slice(1, 3).map(td => td.textContent.replace(',', '.'))
    if (parseInt(alis) === 0)
        return
    const str = `${zaman},${kur},${alis},${satis}\n`
    await file.write(new TextEncoder().encode(str))
})

const maden = [['ALT/TL', 'XAU'], ['GMS/TL', 'XAG']]
const resp = await fetch('https://subesizbankacilik.vakifbank.com.tr/gunlukfinans/SubesizBankacilik/AltinFiyatlari.aspx')
document = new DOMParser().parseFromString(await resp.text(), "text/html")
document.querySelectorAll(".GridStyle tr:not(.sari)").forEach(async tr => {
    const tds = [...tr.querySelectorAll("td")]
    const kur = maden.find((value) => tds[0].textContent.includes(value[0]))?.[1]
    if (kur === undefined)
        return
    const [alis, satis] = tds.slice(2, 4).map(td => td.textContent.replace(',', '.'))
    const str = `${zaman},${kur},${alis},${satis}\n`
    await file.write(new TextEncoder().encode(str))
})

file.close()
await Deno.remove(filename)