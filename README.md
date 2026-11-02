# 通勤中

[打开游戏](https://chouclover-spec.github.io/game-driver-play/)。

本仓库统一维护游戏源码、网页素材和 GitHub Pages 线上版本。

## 本地运行

需要 Node.js 18 或更新版本，无需安装依赖。

```sh
npm start
```

访问 http://localhost:5173 。

## 验证与发布

```sh
npm test
npm run build:pages
```

GitHub Pages 从 `main / (root)` 发布。推送源码和素材到 main 后自动更新，试玩链接保持不变。【开发】

单文件产物为 `通勤中-双击即玩.html`，发布包位于 `release/github-pages/`。【开发】

## 角色资源

四位车手各有首页、成功、失算三张独立透明立绘。
资源与提示词见 `assets/character-illustrations-v2.json`，角色属性统一在 `drivers.js`。

成绩和关卡进度保存在当前浏览器，不是联网榜单。
