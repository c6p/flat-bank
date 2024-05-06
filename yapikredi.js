import { readJSON } from 'https://deno.land/x/flat/mod.ts'

const filename = Deno.args[0]
const data = await readJSON(filename)

const file = await Deno.open("yapikredi.csv", { append: true });
for (const { code, buy, sell, Date } of data.d) {
  const zaman = Date.match(/\/Date\((\d+)000\)\//)?.[1]
  const str = `${zaman},${code},${buy},${sell}\n`
  await file.write(new TextEncoder().encode(str));
}
file.close();
await Deno.remove(filename)