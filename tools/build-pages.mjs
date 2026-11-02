// Pages 仅发布自包含游戏，不复制项目文档、测试、Git 元数据或本地记录。
import './build-offline.mjs';
import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const directory = resolve('release/github-pages');
await mkdir(directory, { recursive: true });
await copyFile('通勤中-双击即玩.html', resolve(directory, 'index.html'));
await writeFile(resolve(directory, '.nojekyll'), '');
const html = await readFile(resolve(directory, 'index.html'));
console.log(`Pages 发布目录：${directory}`);
console.log(`index.html SHA-256：${createHash('sha256').update(html).digest('hex')}`);
