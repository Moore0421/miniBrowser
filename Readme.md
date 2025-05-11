# Mini Browser

一个基于 Electron 的简易多标签浏览器。

## 屏幕截图
![screenshot](screenshot.png)

## 功能特性

- 多标签浏览体验
- 侧边栏书签管理（添加、编辑、删除）
- 内置搜索栏，支持网址直达和搜索引擎检索
- 更多功能开发中...

## 安装与运行

1. 克隆本仓库到本地：

   ```bash
   git clone <your-repo-url>
   cd electron
   ```

2. 安装依赖：

   ```bash
   npm install
   ```

3. 启动应用：

   ```bash
   npm start
   ```

## 打包发布

使用 [electron-builder](https://www.electron.build/) 进行打包：

```bash
npm run build
```

打包产物位于 `dist/` 目录。

## 目录结构

- `main.js`         主进程入口，窗口与 IPC 管理
- `preload.js`      预加载脚本，暴露安全 API
- `renderer.js`     渲染进程逻辑，UI 交互
- `index.html`      主界面
- `bookmark-edit.html`  书签编辑弹窗
- `styles.css`      全局样式
- `newtab.html`     新标签页内容
- 其它辅助文件

## 开发提示

- 书签数据保存在用户目录下的 `bookmarks.json`
- 支持 Windows、macOS、Linux 多平台打包
- 可通过 F12 调试渲染进程

## 贡献

项目仍处于非常初期的阶段，欢迎提交 Pull Request 或 Issue为项目提供意见和建议。

## 许可证

MIT License
