# 角色外观与载具以本轮五张用户参考图为准

原附件名、尺寸与 SHA-256 见 [character-references.json](character-references.json)。
以下三视图 WebP 是用户原图等比压缩副本，保留为角色身份和视角依据。

| 角色 | 三视图 | 固定载具 |
| --- | --- | --- |
| CLOVER | `clover-turnaround.webp` | 红色小车 |
| CJYYYZA | `cjyyza-turnaround.webp` | 绿色折叠车 |
| WULONG | `wulong-turnaround.webp` | 黄色三轮车 |
| SEBASTIAN | `sebastian-turnaround.webp` | 蓝色飞行器 |

载具参考为 `driver-vehicles.webp`，左上 CLOVER、右上 WULONG、左下 CJYYYZA、右下 SEBASTIAN。
角色属性及资源路径统一在 `drivers.js`，局内保持背面朝向。
首页和结算使用本轮内置 image_gen 单独生成的 12 张立绘：每个角色各有首页、成功、失败三种姿态。
原始 PNG 保留；网页使用 WebP 导出，透明通道逐像素校验一致。
资源、身份参考和完整提示词见 `character-illustrations-v2.json`；CLOVER 首张成功图另留 `clover-victory-v2.prompt.txt`。
UI 风格参考用户指定的 Splatoon，墨迹图形用 CSS 绘制，没有引入该游戏图片或标志。

以下是上一轮资源记录，保留原生成提示词；当前首页不使用旧版四辆卡丁车展示图。

---

# 本轮视觉资源

| 文件 | 来源 / 用途 |
| --- | --- |
| `drivers-reference.webp` | 用户本轮提供的四位车手参考图，等比压缩；CSS 显示角色头像。 |
| `crew-drive.webp` | 内置 imagegen 生成的展示图，等比压缩；用于桌面左栏。 |

原始参考图：用户本轮附件 `codex-clipboard-532aa7d5-9982-427b-b0f6-11aa842ebd85.png`。
生成方式：内置 `image_gen`，参考图为身份依据，非 CLI。
局内车手与车辆由 `render.js` 的 Canvas 绘制，未使用三维模型文件。

生成提示词：

```text
Use case: stylized-concept. Asset type: original wide key art for a cheerful browser driving game, 3:2 landscape. Use the attached image ONLY as character identity reference. Depict exactly these four distinctive adult chibi friends: navy knit beanie and glasses woman, messy dark hair and glasses man, plump gray British shorthair cat with gold eyes, elegant pale silver robot with turquoise eyes and gold monocle. They are driving four tiny open-top toy karts together on a winding gray road through a bright little toy village, three-quarter overhead view. Foreground: beanie driver in a bright cherry-red round kart. Behind: man in cobalt blue kart, cat in sunny yellow kart, robot in mint-green kart. Preserve facial likeness, big heads, tiny bodies, sleepy funny expressions. Polished dimensional 3D animated family console game look, rich primary red yellow blue colors, spring green grass, rounded puffy trees, white clouds, warm soft highlights, ambient occlusion, charming miniature world. Wide composition fills frame, colorful blue sky top third, clean silhouettes, no text, no lettering, no logos, no racing items, no existing game characters. NOT a UI mockup, just final beautiful scene illustration.
```
