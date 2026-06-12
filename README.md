# ConsoleViewer - SillyTavern 控制台日志查看器

一个用于 SillyTavern 的浏览器插件，可以在手机端捕获和查看控制台日志。

## 功能特性

- 📱 **手机端友好**：无需电脑浏览器控制台即可查看日志
- 🔍 **日志过滤**：按级别筛选（Log/Info/Warn/Error）
- 🔎 **搜索功能**：快速搜索日志内容
- 🔄 **反向排序**：支持"最新最前"显示模式
- 📤 **导出功能**：将日志导出为文本文件
- ⚡ **实时捕获**：实时记录 console.log/warn/error/info 输出
- 🎨 **主题适配**：自动适配 SillyTavern 主题颜色

## 安装方法

### 方式一：通过插件面板安装（推荐）

1. 打开 SillyTavern
2. 点击 wand（魔杖）按钮打开扩展菜单
3. 点击"管理扩展"或"Extensions"按钮
4. 在扩展面板中，点击"安装第三方扩展"按钮（通常是 + 号或下载图标）
5. 在弹出的对话框中输入本仓库的 Git URL：
   ```
   https://github.com/CironaSIe/st-ConsoleViewer.git
   ```
6. 点击"安装"按钮
7. 安装完成后，在扩展列表中会出现"控制台日志"入口
8. 刷新页面即可使用

### 方式二：手动安装

1. 下载本仓库的 ZIP 文件或克隆到本地
2. 将整个 `ConsoleViewer` 文件夹复制到：
   ```
   SillyTavern/public/scripts/extensions/third-party/
   ```
3. 重启 SillyTavern 服务
4. 刷新浏览器页面

## 使用说明

### 基本操作

1. 点击 wand（魔杖）按钮打开扩展菜单
2. 选择"控制台日志"打开设置面板
3. 勾选"记录"开关开始捕获日志

### 筛选和搜索

- **级别筛选**：点击 Log/Info/Warn/Error 按钮筛选特定级别的日志
- **搜索**：在搜索框中输入关键词过滤日志内容

### 高级功能

- **最新最前**：勾选后，新日志会显示在列表顶部
- **错误通知**：捕获到 error 级别日志时弹出 toastr 通知
- **调用堆栈**：记录日志的调用堆栈（可能影响性能）
- **导出**：将所有日志导出为文本文件
- **清空**：清空当前捕获的所有日志

### 日志详情

点击任意日志条目可以展开查看：
- 完整的参数值
- 调用堆栈（如果启用）

## 界面说明

### 底部状态栏

- **错误通知**：开启/关闭 error 日志的 toastr 通知
- **堆栈**：开启/关闭调用堆栈记录
- **记录**：开启/关闭日志捕获
- **最新最前**：控制日志显示顺序

### 顶部工具栏

- **全部**：显示所有级别的日志
- **Log/Info/Warn/Error**：筛选特定级别
- **搜索框**：输入关键词过滤
- **导出按钮**：导出日志为文件
- **清空按钮**：清空所有日志

## 配置说明

插件配置保存在 SillyTavern 的 extension_settings 中，键名为 `consoleViewer`：

```json
{
  "recording": true,
  "notifyOnError": true,
  "captureStack": false,
  "reverseOrder": false
}
```

- `recording`：是否正在记录日志
- `notifyOnError`：是否在 error 时弹出通知
- `captureStack`：是否记录调用堆栈
- `reverseOrder`：是否最新日志显示在最前

## 开发说明

### 文件结构

```
ConsoleViewer/
├── index.js          # 主逻辑
├── settings.html     # 界面模板
├── style.css         # 样式文件
├── manifest.json     # 插件配置
└── README.md         # 本文件
```

### 依赖

- SillyTavern 最新版
- jQuery（SillyTavern 内置）
- toastr（SillyTavern 内置）

### 技术实现

- 使用 `SillyTavern.getContext()` 获取上下文
- 通过 `ctx.renderExtensionTemplateAsync()` 渲染模板
- 使用 `ctx.extensionSettings` 存储配置
- 重写 console 方法捕获日志

## 常见问题

### Q: 为什么看不到日志？

A: 请检查：
1. 是否勾选了"记录"开关
2. 插件是否正确加载（检查 toastr 通知）
3. 刷新页面后重试

### Q: 如何查看调用堆栈？

A: 勾选"堆栈"开关，然后点击日志条目展开详情。

### Q: 导出的日志在哪里？

A: 导出的日志会下载为文本文件，文件名格式为 `控制台日志-YYYY-MM-DD.log`

### Q: 会影响性能吗？

A:
- 基本功能影响很小
- 开启"调用堆栈"会略微增加内存使用
- 最多保留 500 条日志，自动清理旧日志

## 作者

**CironaSIe**

由 OpenCode 协助调试优化
