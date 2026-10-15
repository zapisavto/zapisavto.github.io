// Собирает страницы-переадресации: /<slug>/ → приложение онлайн-записи.
// Цель переадресации задаётся одной строкой TARGET — при переезде меняем только её.
import fs from "node:fs"
const TARGET = "https://d5d92av671j498jm7490.4kscn31j.apigw.yandexcloud.net/s/"
const API = "https://d5d92av671j498jm7490.4kscn31j.apigw.yandexcloud.net/api/call"
const SITE = "https://zapisavto.github.io/"
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
const slugs = fs.readFileSync("tools/slugs.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
const cache = fs.existsSync("tools/studios.json") ? JSON.parse(fs.readFileSync("tools/studios.json", "utf8")) : {}
const page = (slug, s) => {
  const url = TARGET + slug
  const title = s ? `Онлайн-запись — ${s.name}` : "Онлайн-запись"
  const desc = s ? `${s.city ? s.city + ", " : ""}${s.address || ""}. Выберите услугу и свободное время — запись без звонка.` : "Запись без звонка"
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}${slug}/">
${s?.image ? `<meta property="og:image" content="${esc(s.image)}">` : ""}
<meta http-equiv="refresh" content="0; url=${url}">
<link rel="canonical" href="${url}">
<script>location.replace(${JSON.stringify(url)})</script>
</head><body style="font-family:sans-serif;padding:24px">Открываю запись… <a href="${url}">Нажмите, если не открылось</a></body></html>\n`
}
let made = 0, miss = []
for (const slug of slugs) {
  let s = cache[slug]
  if (!s) {
    try {
      const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: "public:getStudio", args: { slug } }) })
      const v = (await r.json()).value
      const st = v?.studio || v
      if (st?.name) s = cache[slug] = { name: st.name, city: st.city, address: st.address, image: st.heroImage }
    } catch {}
  }
  if (!s) miss.push(slug)
  fs.mkdirSync(slug, { recursive: true })
  fs.writeFileSync(`${slug}/index.html`, page(slug, s))
  made++
}
fs.writeFileSync("tools/studios.json", JSON.stringify(cache, null, 1))
fs.writeFileSync("index.html", `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title></title></head><body></body></html>\n`)
fs.writeFileSync("404.html", `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title></title></head><body></body></html>\n`)
console.log(`страниц: ${made}, без данных из приложения: ${miss.length} ${miss.join(" ")}`)
