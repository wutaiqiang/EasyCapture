# EasyCapture

点击滚动区域，自动滚动并拼接长截图，在浏览器本机预览、下载 PNG。

[下载](https://github.com/wutaiqiang/EasyCapture/releases/latest) · [产品主页](https://wutaiqiang.github.io/EasyCapture/) · [隐私政策](https://wutaiqiang.github.io/EasyCapture/privacy-policy.html) · [问题反馈](https://github.com/wutaiqiang/EasyCapture/issues)

## 使用

1. 下载并解压安装包。
2. 在 Edge 打开 `edge://extensions`，开启开发人员模式，加载包含 `manifest.json` 的扩展文件夹。
3. 点击扩展图标 → 选择滚动区域 → 点击蓝框。
4. 保持当前标签页，等待自动滚动和拼接；新标签打开预览后下载 PNG。按 Esc 可取消。

支持整页、独立表格和侧栏，支持常见系统缩放，结束后恢复滚动位置。超长图会分段并提供 ZIP 下载；动态网页可选慢速模式。当前界面语言为简体中文。

## 数据与权限

扩展仅在用户主动触发后读取当前网页内容，全部裁切和拼接在本机完成，没有上传接口、账号、广告或跟踪。权限仅为 activeTab、scripting、storage、downloads。具体数据处理、保留和删除方式见隐私政策。

## 支持范围

普通网页的纵向滚动；只截当前可见宽度。受保护页面及 iframe 内嵌内容可能不支持；iframe 请先在独立标签打开。无限加载和虚拟列表取决于页面加载行为，预览中会标记达到上限后的部分截图。

## 目录

- `extension/`：Manifest V3 扩展源码，可直接加载。
- `docs/`：产品主页和隐私政策。
- `assets/`：商店图标和展示素材。

用户已在 Edge 加载并确认基本功能可用。自动验证覆盖整页、滚动表格、100%/125%/200%缩放、超高容器与取消恢复；自动测试环境使用浏览器接口桥接，不等同于商店审核或跨全部网站的兼容性保证。
