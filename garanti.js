const filename = Deno.args[0]
Deno.remove(filename)
//const r = await fetch("https://www.garantibbva.com.tr/doviz-kurlari", { "credentials": "include", "method": "GET" })
const TIME_OFFSET = 3

// TODO may write as axios_config
const data = await(await fetch("https://customers.garantibbva.com.tr/internet/digitalpublic/currency-convertor-public/v1/currency-convertor/currency-list-detail", {
  "credentials": "include",
  "headers": {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "channel": "Internet",
    "ip": "127.0.0.1",
    "dialect": "TR",
    "guid": "2c041ca2e9fe40bab789c7c857b56eab",
    "tenant-company-id": "GAR",
  },
  "referrer": "https://webforms.garantibbva.com.tr/",
  "method": "GET",
})).json()

const { currDate, currTime } = data[0]
const date = new Date(`${currDate}T${currTime}Z`)
date.setHours(date.getHours() - TIME_OFFSET)
const zaman = Math.floor(date.getTime() / 1000)

const file = await Deno.open("garanti.csv", { append: true });
for (const { currCode, exchBuyRate, exchSellRate } of data.filter(({ currCode: s }) => s.substring(s.length - 3, s.length) === "/TL")) {
  const code = currCode.substring(0, 3)
  const str = `${zaman},${code === "ALT" ? "XAU" : code},${exchBuyRate},${exchSellRate}\n`
  await file.write(new TextEncoder().encode(str))
}
file.close();