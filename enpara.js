import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const filename = Deno.args[0]
const html = await Deno.readTextFile(filename)
const document = new DOMParser().parseFromString(html, "text/html")

const zaman = Math.floor(new Date().getTime() / 1000)
const kurlar = [["usd", "USD"], ["eur", "EUR"], ["altın", "XAU"]]

const file = await Deno.open("enpara.csv", { append: true });
document.querySelectorAll("div.enpara-gold-exchange-rates__table-item").forEach(async div => {
    const spans = [...div.querySelectorAll("span")]
    const kur = kurlar.find((value) => spans[0].textContent.trim().toLocaleLowerCase("tr").includes(value[0]))[1]
    const [alis, satis] = spans.slice(1, 3).map(span => span.textContent.split(' ')[0].replace('.', '').replace(',', '.'))

    const str = `${zaman},${kur},${alis},${satis}\n`
    await file.write(new TextEncoder().encode(str))
})
file.close()
await Deno.remove(filename)