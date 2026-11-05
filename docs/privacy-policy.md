# EasyCapture 隐私政策

生效日期：2026 年 11 月 5 日

EasyCapture 由 GitHub 用户 **wutaiqiang** 发布，用于用户主动选择网页滚动区域后，在浏览器本机生成、预览和下载长截图。本政策适用于 EasyCapture 浏览器扩展。

## 读取和处理的信息

只有用户点击扩展按钮或使用快捷键启动后，EasyCapture 才访问当前标签页。为完成截图，它会读取所选区域的显示内容、布局和滚动尺寸，并临时使用浏览器提供的可见标签页截图。浏览器首先提供整个可见页面的图像，扩展随即在本机裁出所选区域；只有裁切后的图像会写入本机截图缓存。

网页显示内容可能包含个人信息。EasyCapture 不识别或提取其中的姓名、联系方式、密码、账户、财务等字段；用户选择范围内可见的信息会成为截图的一部分。请自行决定希望保留或分享的内容。

扩展会在浏览器本地保存截图图像、页面标题、滚动区域标签、截图时间、图像尺寸、完成状态及用户设置。临时错误信息保存在浏览器会话存储中。当前标签页地址仅用于判断页面是否支持截图；扩展不建立浏览历史记录，不在截图记录中保存网址，也不使用 Cookie 或历史记录接口读取登录信息。

## 用途和传输

上述信息仅用于生成、预览、下载和管理用户主动发起的截图。EasyCapture 没有服务器上传、账户注册、广告、统计分析、跟踪或远程代码。开发者不会通过扩展接收截图或网页内容，不出售、共享或用于广告、征信等其他目的。

网页自身可能在滚动时加载内容，这属于该网站的行为。用户主动将图片发给他人、将文件保存到同步文件夹，或使用浏览器/操作系统提供的其他服务时，适用相应服务的政策。

## 本机存储和删除

截图保存在该浏览器扩展自己的 IndexedDB 中，偏好保存在扩展本地存储中。开始新截图及完成截图时，扩展清理超过 24 小时或最近 10 次以外的缓存记录。这种清理在扩展运行时执行，并非浏览器关闭期间的定时删除。

用户可以在预览页点击“删除”清理该截图缓存，或在浏览器中移除扩展、清理扩展数据。用户手动下载的 PNG/ZIP 文件保留在其选择的位置，需要自行删除。取消或失败的截图会尝试立即删除中间缓存。

## 权限

- **activeTab**：在用户触发后临时访问当前标签页并获取截图。
- **scripting**：选择区域、滚动、临时隐藏重复固定栏，并恢复页面位置和样式。
- **storage**：保存用户偏好和临时状态；截图另存于本机 IndexedDB。
- **downloads**：在用户点击下载后保存 PNG 或 ZIP。

EasyCapture 不申请所有网站的常驻访问权限，也不申请 Cookie、浏览历史、身份认证或剪贴板读取权限。

## 联系和更新

问题反馈：[GitHub Issues](https://github.com/wutaiqiang/EasyCapture/issues)。反馈内容是用户主动公开提交到 GitHub 的信息；请不要附带密码、Cookie、令牌或不希望公开的截图。GitHub 网站及 GitHub Pages 的访问由 GitHub 自身政策管理，扩展运行不会自动访问这些网站。

如果扩展的数据处理方式变化，本政策会随版本更新。当前扩展所需信息以商店披露和本政策为准。

---

# EasyCapture Privacy Policy

Effective date: November 5, 2026

EasyCapture, published by **wutaiqiang**, captures a user-selected scrollable area and stitches, previews, and downloads screenshots locally in the browser.

The extension accesses the active page only after the user invokes it. It reads visible page content and layout/scroll measurements. The browser supplies a visible-tab image; the extension immediately crops it locally and persists only the selected region. Visible personal information may be included in the user's screenshot, but the extension does not identify or extract personal fields.

Local records contain screenshot images, page titles, selected-area labels, timestamps, dimensions, status, preferences, and transient error messages. The current tab URL is used to check page support; screenshot records do not retain URLs. The extension does not read browser cookies or browsing-history databases.

There are no uploads, accounts, ads, analytics, tracking, remote scripts, or developer access to captured content. Data is used only for the capture feature and is not sold or used for advertising, creditworthiness, or unrelated purposes. The underlying website may make its own requests while scrolling.

Images are stored in extension-local IndexedDB. On starting and completing a capture, records older than 24 hours or outside the most recent 10 captures are removed. Cleanup runs when the extension runs, not while the browser is closed. Users can delete a capture from its preview or remove/clear extension data. Downloaded files must be deleted separately. Cancellation or failure triggers an attempt to remove intermediate files.

Permissions are limited to activeTab (user-triggered page access/capture), scripting (selection/scrolling/restoration), storage (preferences/status), and downloads (user-requested PNG/ZIP saving). No cookie, history, identity, clipboard-read, or persistent all-sites permission is requested.

Contact: [GitHub Issues](https://github.com/wutaiqiang/EasyCapture/issues). Issues are public, user-initiated communications to GitHub; do not post secrets or private screenshots. Visits to GitHub-hosted source and policy pages are subject to GitHub's policies. Material changes to the extension's data practices will be reflected in this policy.
