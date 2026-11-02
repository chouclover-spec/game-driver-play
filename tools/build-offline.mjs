// 把 index.html + style.css + 7 个 ES 模块打成一个可以直接双击打开的 HTML。
// 原因：file:// 下浏览器不允许加载 <script type="module">（CORS: origin null），
// 所以源码必须走 http 服务器，单文件版本把脚本改成普通内联脚本才不依赖服务器。
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ORDER = ['palette.js', 'drivers.js', 'campaign.js', 'game.js', 'reactions.js', 'render.js', 'app.js'];
const OUT = '通勤中-双击即玩.html';

// 去掉模块语法：文件里所有 import/export 都写在单行开头，直接按行剥离。
// import 里的 `X as Y` 别名要还原成 `const Y = X;`，否则运行时找不到名字。
const IMPORT_RE = /^import\s*\{([^}]+)\}\s*from\s*'[^']+';\s*$/gm;
const strip = source => source
  .replace(IMPORT_RE, '')
  .replace(/^export default /gm, '')
  .replace(/^export /gm, '');
const aliasesOf = source => [...source.matchAll(IMPORT_RE)]
  .flatMap(m => m[1].split(',').map(spec => spec.trim()).filter(Boolean))
  .map(spec => spec.split(/\s+as\s+/))
  .filter(parts => parts.length === 2)
  .map(([original, alias]) => `const ${alias.trim()} = ${original.trim()};`);

const html = await readFile('index.html', 'utf8');
const css = await readFile('style.css', 'utf8');
// 角色图与展示图一起内嵌，单文件离开 assets 目录也能直接玩。
const inlineAssets = async source => {
  const paths = [...new Set(source.match(/assets\/[\w-]+\.(?:png|webp|jpg)/g) || [])];
  for (const path of paths) {
    const bytes = await readFile(path);
    const mime = path.endsWith('.jpg') ? 'image/jpeg' : path.endsWith('.webp') ? 'image/webp' : 'image/png';
    source = source.replaceAll(path, `data:${mime};base64,${bytes.toString('base64')}`);
  }
  return source;
};
const parts = [], aliases = [];
for (const file of ORDER) {
  const source = await readFile(file, 'utf8');
  aliases.push(...aliasesOf(source));
  parts.push(`// ===== ${file} =====\n${strip(source).trim()}`);
}
// 别名统一放在最后一段之前：此时所有定义都已就位，app.js 的启动代码还没跑。
parts.splice(parts.length - 1, 0, `// ===== 模块别名 =====\n${aliases.join('\n')}`);

const banner = '<!-- 由 tools/build-offline.mjs 生成：单文件版，双击即可玩，不需要 npm start。\n     改玩法请改源码（index.html / style.css / *.js），然后重新运行 node tools/build-offline.mjs -->\n';

let out = banner + html
  .replace(/<link rel="stylesheet" href="style\.css">/, `<style>\n${css}\n</style>`)
  .replace(/<script type="module" src="app\.js"><\/script>/, `<script>\n(function () {\n'use strict';\n${parts.join('\n\n')}\n})();\n</script>`);
out = await inlineAssets(out);

if (out.includes('type="module"')) throw new Error('模块脚本没替换掉，检查 index.html');
await writeFile(OUT, out, 'utf8');
console.log(`写入 ${resolve(OUT)} · ${(Buffer.byteLength(out) / 1024).toFixed(0)}KB`);
