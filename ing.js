//const filename = Deno.args[0]
//await Deno.remove(filename)

const now = new Date()
const zaman = Math.floor(now.getTime() / 1000)
let offsetMinutes = now.getTimezoneOffset()
now.setMinutes(now.getMinutes() - offsetMinutes)
const date = now.toISOString()

const url = "https://www.ing.com.tr/ProxyManagement/SiteManagerService_Script.aspx/GetCurrencyRates"
const options = { body: JSON.stringify({ date }), method: "POST", headers: { "Content-Type": "application/json" } }
const resp = await fetch(url, options)
const data = await resp.json()

const file = await Deno.open("ing.csv", { append: true })
for (const kur of data.d) {
  const { CurrencySymbol, BuyingExchangeRate, SellingExchangeRate } = kur
  const str = `${zaman},${CurrencySymbol},${BuyingExchangeRate},${SellingExchangeRate}\n`
  await file.write(new TextEncoder().encode(str))
}
file.close()