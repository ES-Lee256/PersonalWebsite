# 诸葛蕴乂 · 个人网站

一个纯静态、无构建步骤的个人网站，直接由 `index.html` 作为唯一入口。适合部署在 GitHub Pages。

- 简体中文硬编码为默认语言；繁体中文、英文来自 `lang/*.conf`。
- 主页包含圆形头像、昵称、英文名、介绍、Bilibili / GitHub / 个人邮箱。
- Bilibili 精选栏常显，采用 Bilibili 风格的封面卡片。
- 五个内容栏目均由 conf 驱动：B 站精选、GitHub 开源项目、游戏项目、商业实体物品、个人橱窗。
- 支持项目全屏展开和多网站弹窗。
- 不需要 Python、Node 或任何后台服务。

## 入口与部署

`index.html` 是绝对入口，直接位于仓库根目录。所有资源路径均为相对路径，可部署在仓库子路径下。

GitHub Pages：

1. 将仓库推送到 GitHub。
2. 打开仓库的 **Settings → Pages**。
3. Source 选择 **Deploy from a branch**，分支选择你的发布分支，目录选择 **/(root)**。
4. 保存后访问 Pages 给出的网址。

根目录已包含 `.nojekyll`，避免 GitHub Pages 的 Jekyll 处理影响静态文件。

### 为什么双击 `index.html` 读不到 conf

这是浏览器的安全限制，不是 conf 写错：Edge / Chrome 在 `file://` 协议下会拦截 ES module 和 `fetch` 本地 conf，页面会看起来一直停在加载状态。

请任选一种方式：

- 部署到 GitHub Pages 后访问 Pages 网址；
- 用 VS Code 的 **Live Server** 打开；
- 或在本目录启动一个静态服务器，例如：

```powershell
python -m http.server 8000
```

然后访问 `http://127.0.0.1:8000/`。这个命令只是临时预览，不依赖项目里的 Python 文件。

页面检测到 `file://` 时也会显示顶部提示，说明原因。

## 目录结构

```text
PersonalWebsite/
├─ index.html                  唯一入口
├─ .nojekyll                   GitHub Pages 静态标记
├─ assets/
│  ├─ css/style.css
│  └─ js/
│     ├─ app.js                渲染、语言切换、详情页、弹窗
│     ├─ conf.js               conf 解析器
│     └─ content.js            conf → 页面数据
├─ content/
│  ├─ mainpage/                主页信息
│  │  ├─ mainpage.conf
│  │  ├─ avatar.jpg
│  │  ├─ presentation.txt
│  │  ├─ presentation.zh-TW.txt
│  │  └─ presentation.en.txt
│  ├─ bilibili/                Bilibili 精选栏
│  │  └─ bilibili.conf
│  ├─ gitproduct/              GitHub 开源项目
│  │  ├─ git.conf
│  │  └─ rix2rol.txt
│  ├─ gameproject/             游戏项目
│  │  └─ game.conf
│  ├─ commercial/              商业实体物品
│  │  └─ commercial.conf
│  └─ showcase/                个人橱窗
│     └─ showcase.conf
├─ icon/                       图标
└─ lang/
   ├─ lang-zh-tw.conf
   ├─ lang-en.conf
   └─ languages.json           语言栏清单
```

## 主页与个人邮箱

`content/mainpage/mainpage.conf`：

```ini
[mainpage]
avatar = avatar.jpg
nickname = 诸葛蕴乂
engname = Esric Lee
presentation = presentation.txt
bilibili = https://space.bilibili.com/1354234599
bicon = bilibili.svg
github = https://github.com//ES-Lee256
gicon = github.svg
email = yourname@outlook.com
eicon = outlook.svg
```

- `email` 目前是占位地址，请替换为你的 Outlook 邮箱。页面会生成 `mailto:` 链接，按钮名为「个人邮箱」，并在按钮下显示「若有要务或有要反馈的意见，请用这个邮箱。」
- `email` 留空时，邮箱按钮和提示文字都会隐藏。
- `eicon` 默认使用 `icon/outlook.svg`，已绘制 Outlook 风格图标。
- `avatar` 相对于 `content/mainpage/`，页面会裁成圆形。
- `presentation` 可指向 `.txt` 或直接写介绍。
- 社交按钮文字由语言包提供。

> 注：你手动填写的 GitHub 地址保留原样，没有改动。

## Bilibili 精选栏

配置文件：`content/bilibili/bilibili.conf`

```ini
[bilibili]
# 可选：覆盖栏目标题、眉题、说明
# title = Bilibili 精选
# kicker = BILIBILI FEATURED
# description = 从 Bilibili 挑出的一些片段、创作与收藏。

x[1]
title = example
picture = pic.jpg
web = https://www.bilibili.com/video/BV1xx411c7mD
top = 0

x[2]
title = example
picture =
web =
top = 1
```

- `x[1]` 表示暂时关闭；去掉 `x` 即显示。
- `title`：卡片标题。
- `picture`：封面图片，路径相对于 `content/bilibili/`。
- `web`：点击整张卡片跳转的视频链接；留空时卡片只展示、不跳转，不单独显示跳转按钮。
- `top`：`1` 为置顶，`0` 为普通。置顶项目自动排在最前，并显示「置顶」角标。
- 该栏目**始终显示**，包括没有任何项目或配置读取失败时；空状态会显示「暂无精选内容，敬请期待」。
- 卡片模仿 Bilibili 的封面 / 双行标题 / 精选标签 / 置顶角标 / 悬停播放按钮样式。

## 普通项目格式

适用于 GitHub 开源项目、游戏项目、商业实体物品、个人橱窗。

```ini
[1]
title = 项目标题
content = 一段直接写在配置里的介绍
picture = pic.jpg
web = https://example.com github.svg 项目网站

x[2]
title = example
content = example.txt
picture =
web = 2
1 = https://example.com github.svg 网站甲
2 = https://example.org link.svg 网站乙
```

字段：

- `x[编号]`：禁用项目；`[编号]` 为启用。编号只用于排序与展示。
- `title`：卡片与展开页标题。
- `content`：直接写文字，或指向本栏目目录下的 `.txt` 文件。
- `picture`：本栏目目录下的图片；留空则不保留图片位置。
- `web`：单个链接，或写数字表示多个链接。

### web 与图标的新写法

图标不再单独写 `icon =`，而是紧跟在链接后面：

```ini
web = https://example.com github.svg 自定义按钮文字
```

浏览器读取时按**图片文件扩展名**识别图标，剩下的整段文字就是按钮名，因此名称里可以有空格，不需要引号。

多网站：

```ini
web = 2
1 = https://example.com github.svg 网站甲
2 = https://example.org link.svg 网站乙
```

- 不写图标时：`web = https://example.com 按钮文字`
- 只写图标、不写按钮名时：`web = https://example.com github.svg`
- 多个网站时，总跳转按钮使用第一条链接的图标；弹窗内每个网站使用各自图标。
- 兼容旧的 `icon =` 写法，但新配置建议统一使用上面的内联写法。

游戏栏额外支持工作室官网：

```ini
x[studiowebsite]
title = 工作室官网
content = 介绍文字或 studio.txt
picture = studio.jpg
web = https://example.com studio.svg
```

工作室官网按钮默认文字为「去游戏官网」，普通游戏项目为「去查看」。

## 栏目行为

| 栏目 | 空状态 |
| --- | --- |
| Bilibili 精选 | 始终显示，显示空提示 |
| GitHub 开源项目 | 保留栏目，显示空提示 |
| 游戏项目 | 保留栏目，整屏居中显示「暂无游戏，敬请期待」 |
| 商业实体物品 | 整栏与导航项隐藏 |
| 个人橱窗 | 整栏与导航项隐藏 |

## 语言包

简体中文在 `index.html` / `assets/js/app.js` 中硬编码，`lang/` 不需要简体中文文件。

`lang/lang-en.conf` 与 `lang/lang-zh-tw.conf` 使用同样的格式：

```ini
[language]
code = ja
name = 日本語
locale = ja
dir = ltr
order = 40

[ui]
nav.home = ホーム
action.expand = 展開
game.empty = ゲームはまだありません。
```

- `[language]` 是必需的；`code` 是唯一标识，`name` 显示在语言栏，`order` 控制排序。
- `[ui]` 缺少的键自动回退到简体中文。
- 页面内容也可以按语言覆盖：

```ini
[mainpage]
presentation = presentation.ja.txt

[git.1]
title = プロジェクト名
content = project.ja.txt

[bilibili.1]
title = おすすめ
```

### 新增语言（静态站）

GitHub Pages 不能动态列目录，所以语言栏读取 `lang/languages.json`。新增语言时：

1. 添加 `lang/lang-xx.conf`。
2. 在 `lang/languages.json` 的 `languages` 数组中加入对应元数据：

```json
{
  "code": "ja",
  "name": "日本語",
  "locale": "ja",
  "dir": "ltr",
  "order": 40,
  "file": "lang-ja.conf"
}
```

3. 一起提交并部署。语言栏刷新后会读取新的清单。

## 页面交互

- 项目卡片有「展开查看」和跳转按钮，胶囊形按钮，文字居中。
- 展开页只保留网站 logo，返回在标题上方，跳转紧接正文。
- 多网站使用网页内弹窗。
- 支持 Esc 关闭、焦点约束、移动端布局与 reduced motion。

## 注意

- 所有 `.conf` 与 `.txt` 必须为 UTF-8。
- 图片路径、txt 路径均相对于对应栏目的 content 目录。
- `icon` 图标默认从根目录 `icon/` 查找；图片路径可包含相对目录。
- 目前 `content/gitproduct/git.conf` 中 `rix2rol` 项目引用 `pic.jpg`，但该文件尚未放入目录，因此卡片不会显示配图；放入 `content/gitproduct/pic.jpg` 即可。
