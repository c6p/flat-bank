import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { format } from "https://deno.land/std@0.222.1/datetime/mod.ts";

const filename = Deno.args[0]
await Deno.remove(filename)

const zaman = Math.floor(new Date().getTime() / 1000)
const file = await Deno.open("ziraat.csv", { append: true });
for (const [url, selector, kurName] of [
    ["https://www.ziraatbank.com.tr/tr/_layouts/15/Ziraat/FaizOranlari/Ajax.aspx/GetDovizKurlari", '[data-id="rdIntBranchDoviz"] tr', null],
    ["https://www.ziraatbank.com.tr/tr/_layouts/15/Ziraat/FaizOranlari/Ajax.aspx/GetAltinFiyatlari", '[data-id="rdIntBranchAltin"] tr:nth-child(2)', "XAU"]
]) {
    let html = (await (await fetch(url, {
        "headers": { "Content-Type": "core/json", },
        "body": JSON.stringify({ date: format(new Date(), "yyyy-MM-dd") }),
        "method": "POST"
    })).json())?.d?.Data
    let document = new DOMParser().parseFromString(html, "text/html")

    document.querySelectorAll(selector).forEach(async tr => {
        const tds = [...tr.querySelectorAll("td")]
        if (tds.length < 4) return
        const [kur, alis, satis] = [0, 2, 3].map(i => tds[i].textContent.replaceAll(",", "."))
        const str = `${zaman},${kurName ?? kur},${alis},${satis}\n`
        await file.write(new TextEncoder().encode(str))
    })
}
file.close()