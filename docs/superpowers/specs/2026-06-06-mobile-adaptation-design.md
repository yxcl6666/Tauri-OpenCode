# Tauri OpenCode 移动端 UI 深度重构与全面屏自适应设计规范

本文档详述了对 Tauri OpenCode 移动端（通过 Tauri v2 封装 of Android 应用）进行全面屏无缝沉浸式适配以及 UI 自适应重构的技术设计与实施方案。

## 背景与目标
在移动端（通过 Tauri v2 封装的 Android 应用）运行应用时，原有 UI 边缘可能留有白边，或者无法完全利用各种形态手机（如刘海屏、挖孔屏）与平板设备的屏幕空间。
本项目致力于重构移动端 UI 体验，消除任何刻板的“预览手机外框”或假的时钟时间状态栏，将项目名称更改为 **Tauri OpenCode**，实现沉浸式流式自适应排版。

## 方案选择：方案 A 沉浸式流式自适应方案
为了在真实的各种手机和平板上获得极致的无缝一体感，采用**方案 A 沉浸式自适应方案**：
1. **背景底色充满**：取消在最外层容器强行设置 `safe-top/bottom/left/right` 边距的做法，让应用主体背景 `bg-background-base` 完全铺满整张屏幕物理边缘，避免任何尴尬的截断白边/黑边。
2. **局部安全避让**：
   * 将 `safe-top`（`padding-top: env(safe-area-inset-top)`）挂载在顶部的 `header` 元素内部，保护状态栏文本，而 header 背景色仍优雅延伸到状态栏下方。
   * 将 `safe-bottom`（`padding-bottom: env(safe-area-inset-bottom)`）挂载在底部导航栏 `<nav>` (TabBar) 内部以及弹出模态层内部，避免与系统手势指示器重叠。
3. **平板与宽屏折叠屏自适应**：
   * 采用响应式分流布局：在屏幕宽度 > 768px（如平板设备、折叠屏横屏）时，自动转为“左侧侧边栏工作区 + 右侧编辑与对话”的双栏结构，不再套用小屏手机样式。

---

## 核心设计与交互规范

### 1. 沉浸式全面屏与消除白边
* **Viewport 配置**：在 `packages/app/index.html` 中设置：
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  ```
* **CSS 避让区重构**：最外层使用普通铺满类，只在具体的 Header、TabBar 内部应用安全区边距：
  * **Header**: `safe-top px-3 border-b border-border-weak flex items-center justify-between bg-background-strong shrink-0`
  * **TabBar**: `h-14 border-t border-border-weak flex items-center justify-around bg-background-strong shrink-0 safe-bottom`

### 2. 顶栏模型 Badge 与 Plan / Build 胶囊
* **顶栏结构**：一行内流畅排列 `≡` (侧边栏)、`Plan/Build` 模式选择胶囊、`✦ Selected Model` (模型选择 Badge)、`[时钟]` (回溯) 和 `[垃圾桶]` (清空)。
* **项目更名展示**：应用窗口标题及 Onboarding 引导页大字标题统一更名为 **Tauri OpenCode**。

### 3. 底部模型选择层 (Bottom Sheet)
* 点击模型胶囊，弹出从底部往上升起的毛玻璃抽屉层，内置：
  * **推荐模型**：展示星标置顶的最多 3 个模型。
  * **最近使用**：展示其余未置顶模型。
  * **管理模型入口**：底部“管理模型”链接。

### 4. 选项 B：撤销文件回档确认窗 (Confirm Undo)
* 点击回溯按钮时，弹出中文提示窗口 `确认撤销`：
  * **文件变更清单**：列出将被删除/修改的文件名及其对应的红色/橙色标签。

### 5. 完整设置项回归与多语言切换
* 补全设置页设置项并支持双语切换：
  * **当前主题**、**默认 AI 提供商**。
  * **软件语言**：点击弹出 Language Popover，包含“简体中文”与“English”选项，支持未来语种扩展。
  * **关于**：更名为 **关于 Tauri OpenCode**，显示软件版本号。

### 6. 原生无缝滚动设计 (Scrollbar Aesthetics)
* **隐藏默认滚动条**：在所有移动端列表容器（如设置、抽屉、对话流）上使用 `.no-scrollbar` 以消除拼接感强烈的滚动条，仅在滑动时通过系统原生方式显隐。

---

## 实施步骤与模块规划

1. **第 1 步：更名与 Viewport 重置**：修改 `Onboarding.tsx`、`index.html` 中的项目名为 `Tauri OpenCode`。
2. **第 2 步：调整安全区挂载点**：在 `MobileLayout.tsx` 中将外层的 `safe-top/bottom/left/right` 移入 `header` 和 `nav` 中。
3. **第 3 步：滚动条优化**：修复设置页右侧拼接感严重的滚动条，对滚动列表项应用透明隐藏。
4. **第 4 步：编译与真机安装包验证**：使用 Android 命令行编译 APK 进行实际真机适配体验，确保状态栏 and 底部完全沉浸无白边。
