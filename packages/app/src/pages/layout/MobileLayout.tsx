import { createSignal, createMemo, onMount, onCleanup, JSX, Show } from "solid-js";
import { useTheme } from "@opencode-ai/ui/theme/context";
import { useLanguage } from "@/context/language";
import { useLocal } from "@/context/local";
import { useSettings } from "@/context/settings";
import { MobileLanguagePopover } from "./MobileLanguagePopover";
import { MobileModelDrawer } from "./MobileModelDrawer";
import { MobileRollbackDialog, type FileChange } from "./MobileRollbackDialog";

interface MobileLayoutProps {
  children: JSX.Element;
  currentProject: any;
  currentSessions: any;
  openSettings: () => void;
  chooseProject: () => void;
  cycleTheme: () => void;
}

export function MobileLayout(props: MobileLayoutProps) {
  const theme = useTheme();
  const language = useLanguage();
  const settings = useSettings();
  const local = useLocal();

  const [activeTab, setActiveTab] = createSignal<"chat" | "project" | "settings">("chat");
  const [isTablet, setIsTablet] = createSignal(false);

  // Popover 显隐与坐标锚定状态
  const [isLangOpen, setIsLangOpen] = createSignal(false);
  const [langAnchor, setLangAnchor] = createSignal<HTMLElement>();
  const [isModelOpen, setIsModelOpen] = createSignal(false);
  const [isRollbackOpen, setIsRollbackOpen] = createSignal(false);
  
  // 模拟撤销的增删改文件列表
  const [rollbackFiles, setRollbackFiles] = createSignal<FileChange[]>([
    { path: "src/components/UserList.vue", type: "modify" },
    { path: "packages/mobile/scripts/build.sh", type: "delete" },
    { path: "packages/app/index.html", type: "modify" }
  ]);

  // 自适应响应式宽度探测
  const handleResize = () => {
    setIsTablet(window.innerWidth > 768);
  };

  onMount(() => {
    window.addEventListener("resize", handleResize);
    handleResize();
  });

  onCleanup(() => {
    window.removeEventListener("resize", handleResize);
  });

  // 获取当前所选的模型名称
  const currentModelName = createMemo(() => {
    const curr = local.model.current();
    if (!curr) return "Gemini 1.5 Pro";
    const found = local.model.list().find(m => m.id === curr.modelID && m.provider.id === curr.providerID);
    return found ? found.name : "Gemini 1.5 Pro";
  });

  const handleRollbackConfirm = () => {
    setIsRollbackOpen(false);
    // 触发回退操作逻辑
  };

  return (
    <div class="w-full h-full flex flex-col bg-background-base text-text-strong select-none no-scrollbar overflow-hidden">
      {/* 核心顶部状态条与刘海已剔除，直接由系统原生填充 */}
      
      {/* 顶部自适应控制栏 */}
      <header class="safe-top min-h-14 py-2 px-3 border-b border-border-weak flex items-center justify-between bg-background-strong shrink-0">
        <div class="flex items-center gap-2">
          {/* Plan/Build 选择小胶囊 */}
          <div class="bg-background-base border border-border-weak rounded-full p-0.5 flex gap-0.5">
            <button 
              class="px-3 py-1 rounded-full text-[10px] font-bold transition-all"
              classList={{ "bg-background-strong text-primary shadow-sm": activeTab() === "chat", "text-text-weak": activeTab() !== "chat" }}
              onClick={() => setActiveTab("chat")}
            >
              Plan
            </button>
            <button 
              class="px-3 py-1 rounded-full text-[10px] font-bold transition-all text-text-weak"
            >
              Build
            </button>
          </div>
        </div>

        {/* 顶部中央模型 Badge */}
        <button 
          class="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-transparent flex items-center gap-1 active:scale-95 transition-transform max-w-[120px] truncate"
          onClick={() => setIsModelOpen(true)}
        >
          <span>✦</span>
          <span>{currentModelName()}</span>
        </button>

        {/* 右侧回溯时钟与清空按钮 */}
        <div class="flex items-center gap-1">
          <button 
            class="size-8 rounded-lg flex items-center justify-center hover:bg-background-base active:scale-95 transition-all"
            onClick={() => setIsRollbackOpen(true)}
            aria-label="回滚历史"
          >
            {/* 时钟回溯图标 */}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
          </button>
        </div>
      </header>

      {/* 页面主视图与设备分流适配 */}
      <div class="flex-1 flex min-h-0 min-w-0 overflow-hidden relative">
        <Show 
          when={isTablet()} 
          fallback={
            // ----------------------------------------
            // 手机端：通过 Tab 切换单栏页面
            // ----------------------------------------
            <div class="w-full h-full flex flex-col relative overflow-hidden">
              <div class="flex-1 relative overflow-hidden bg-background-base">
                <Show when={activeTab() === "chat"}>
                  <div class="size-full flex flex-col">
                    {props.children}
                  </div>
                </Show>
                
                <Show when={activeTab() === "project"}>
                  <div class="size-full flex flex-col p-4 overflow-y-auto no-scrollbar">
                    <div class="flex justify-between items-center mb-4 border-b border-border-weak pb-2">
                      <span class="font-bold text-sm">项目工作区</span>
                      <button class="text-xs text-primary" onClick={props.chooseProject}>打开文件夹</button>
                    </div>
                    {/* 项目树模拟内容 */}
                    <div class="text-xs text-text-weak">暂未开启特定项目</div>
                  </div>
                </Show>
                
                <Show when={activeTab() === "settings"}>
                  <div class="size-full flex flex-col p-4 gap-4 overflow-y-auto no-scrollbar">
                    <h2 class="font-bold text-base mb-2">设置</h2>
                    
                    {/* 主题设置组 */}
                    <div class="flex flex-col bg-background-strong border border-border-weak rounded-2xl overflow-hidden">
                      <div 
                        class="p-4 flex justify-between items-center border-b border-border-weak active:bg-background-base"
                        onClick={props.cycleTheme}
                      >
                        <div class="flex flex-col gap-0.5">
                          <span class="text-xs font-semibold">当前主题</span>
                          <span class="text-[9px] text-text-weak">切换设备上的配色皮肤</span>
                        </div>
                        <span class="text-xs text-text-weak">切换主题 ›</span>
                      </div>
                    </div>
                    
                    {/* 语言设置组 */}
                    <div class="flex flex-col bg-background-strong border border-border-weak rounded-2xl overflow-hidden">
                      <div 
                        class="p-4 flex justify-between items-center active:bg-background-base"
                        id="mobileLangSettingsRow"
                        onClick={(e) => {
                          setLangAnchor(e.currentTarget);
                          setIsLangOpen(true);
                        }}
                      >
                        <div class="flex flex-col gap-0.5">
                          <span class="text-xs font-semibold">软件语言</span>
                          <span class="text-[9px] text-text-weak">切换界面的显示语言</span>
                        </div>
                        <div class="flex items-center gap-1 text-xs text-primary font-semibold">
                          <span>{language.locale() === "zh" ? "简体中文" : "English"}</span>
                          <span class="text-text-weak">›</span>
                        </div>
                      </div>
                    </div>

                    {/* 文件自动保存设置组 */}
                    <div class="flex flex-col bg-background-strong border border-border-weak rounded-2xl overflow-hidden">
                      <div class="p-4 flex justify-between items-center">
                        <div class="flex flex-col gap-0.5">
                          <span class="text-xs font-semibold">文件自动保存</span>
                          <span class="text-[9px] text-text-weak">在编辑代码时是否自动保存</span>
                        </div>
                        {/* 简易开关组件 */}
                        <div class="w-9 h-5 bg-primary rounded-full relative p-0.5 flex items-center justify-end shrink-0">
                          <div class="size-4 bg-white rounded-full"></div>
                        </div>
                      </div>
                    </div>

                    {/* 关于 */}
                    <div class="flex flex-col bg-background-strong border border-border-weak rounded-2xl overflow-hidden">
                      <div class="p-4 flex justify-between items-center">
                        <div class="flex flex-col gap-0.5">
                          <span class="text-xs font-semibold">关于 Tauri OpenCode</span>
                          <span class="text-[9px] text-text-weak">Tauri + Termux 移动自适应编译器</span>
                        </div>
                        <span class="text-xs text-text-weak">v1.16.0</span>
                      </div>
                    </div>

                  </div>
                </Show>
              </div>

              {/* 底部 TabBar */}
              <nav class="min-h-14 py-1 border-t border-border-weak flex items-center justify-around bg-background-strong shrink-0 safe-bottom">
                <button 
                  classList={{ "flex flex-col items-center gap-0.5 text-text-muted transition-colors": true, "text-primary font-semibold": activeTab() === "chat" }}
                  onClick={() => setActiveTab("chat")}
                >
                  <span class="text-[10px]">对话</span>
                </button>
                <button 
                  classList={{ "flex flex-col items-center gap-0.5 text-text-muted transition-colors": true, "text-primary font-semibold": activeTab() === "project" }}
                  onClick={() => setActiveTab("project")}
                >
                  <span class="text-[10px]">项目</span>
                </button>
                <button 
                  classList={{ "flex flex-col items-center gap-0.5 text-text-muted transition-colors": true, "text-primary font-semibold": activeTab() === "settings" }}
                  onClick={() => setActiveTab("settings")}
                >
                  <span class="text-[10px]">设置</span>
                </button>
              </nav>
            </div>
          }
        >
          {/* ----------------------------------------
              平板/折叠屏/大宽屏横屏：左侧工作区，右侧大内容区
              ---------------------------------------- */}
          <div class="w-full h-full flex overflow-hidden">
            <aside class="w-60 border-r border-border-weak flex flex-col bg-background-weak">
              <div class="p-4 font-bold text-xs border-b border-border-weak flex justify-between items-center">
                <span>My Workspace</span>
                <button class="text-[10px] text-primary" onClick={props.chooseProject}>打开</button>
              </div>
              <div class="flex-1 overflow-y-auto no-scrollbar p-3">
                {/* 平板下的项目结构树 */}
                <div class="text-[11px] text-text-weak">暂未加载特定目录</div>
              </div>
              
              {/* 平板下的快捷设置入口 */}
              <div class="p-3 border-t border-border-weak">
                <button 
                  class="w-full py-2 bg-background-base text-xs font-semibold rounded-lg hover:opacity-85"
                  onClick={() => setActiveTab("settings")}
                >
                  打开高级设置
                </button>
              </div>
            </aside>
            <main class="flex-1 flex flex-col min-w-0">
              {props.children}
            </main>
          </div>
        </Show>
      </div>

      {/* 4. 浮出弹窗与下拉气泡的挂载 */}
      
      {/* 语言选择 Popover */}
      <MobileLanguagePopover
        isOpen={isLangOpen}
        anchorEl={langAnchor}
        onClose={() => setIsLangOpen(false)}
      />

      {/* 模型选择底轴抽屉 */}
      <MobileModelDrawer
        isOpen={isModelOpen}
        onClose={() => setIsModelOpen(false)}
        onManageModels={props.openSettings}
      />

      {/* 回滚二次确认框 */}
      <MobileRollbackDialog
        isOpen={isRollbackOpen}
        changes={rollbackFiles}
        onClose={() => setIsRollbackOpen(false)}
        onConfirm={handleRollbackConfirm}
      />
    </div>
  );
}
