import { createMemo, For, Show } from "solid-js";
import { useLocal } from "@/context/local";
import { useLanguage } from "@/context/language";

interface ModelDrawerProps {
  isOpen: () => boolean;
  onClose: () => void;
  onManageModels: () => void;
}

export function MobileModelDrawer(props: ModelDrawerProps) {
  const local = useLocal();
  const language = useLanguage();
  const model = () => local.model;

  // 过滤出可显示的候选模型列表
  const visibleModels = createMemo(() => {
    return model()
      .list()
      .filter((m) => model().visible({ modelID: m.id, providerID: m.provider.id }));
  });

  // 推荐置顶模型（可以预设前三个，或者带 latest 标志的模型）
  const recommendModels = createMemo(() => {
    return visibleModels().slice(0, 3);
  });

  // 最近使用/其他模型
  const otherModels = createMemo(() => {
    return visibleModels().slice(3);
  });

  const currentModel = () => model().current();

  const isSelected = (m: { id: string; provider: { id: string } }) => {
    const curr = currentModel();
    return curr?.modelID === m.id && curr?.providerID === m.provider.id;
  };

  return (
    <Show when={props.isOpen()}>
      {/* 背景遮罩 */}
      <div 
        class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1100] flex items-end justify-center"
        onClick={props.onClose}
      >
        {/* 底部抽屉主体 */}
        <div 
          class="w-full bg-background-strong rounded-t-3xl shadow-xl p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto no-scrollbar animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶部手势横条 */}
          <div class="w-12 h-1 bg-text-muted/20 rounded-full self-center shrink-0"></div>

          <div class="flex justify-between items-center pb-2 border-b border-border-weak">
            <span class="font-bold text-sm">
              {language.locale() === "zh" ? "选择模型" : "Select Model"}
            </span>
            <button class="text-text-muted hover:text-text-strong text-xs" onClick={props.onClose}>
              ✕
            </button>
          </div>

          {/* 推荐模型栏 */}
          <div class="text-[10px] text-text-weak font-bold uppercase tracking-wider">
            {language.locale() === "zh" ? "推荐模型" : "Recommended"}
          </div>
          <div class="flex flex-col gap-2">
            <For each={recommendModels()}>
              {(m) => (
                <button
                  class="w-full text-left p-3 border rounded-xl flex justify-between items-center transition-all"
                  classList={{
                    "border-primary bg-primary/5 text-primary font-semibold": isSelected(m),
                    "border-border-weak hover:bg-background-base": !isSelected(m),
                  }}
                  onClick={() => {
                    model().set({ modelID: m.id, providerID: m.provider.id }, { recent: true });
                    props.onClose();
                  }}
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-xs">{m.name}</span>
                    <span class="text-[9px] text-text-weak font-normal">{m.provider.name}</span>
                  </div>
                  <Show when={isSelected(m)}>
                    <span class="text-xs">✓</span>
                  </Show>
                </button>
              )}
            </For>
          </div>

          {/* 其它模型栏 */}
          <Show when={otherModels().length > 0}>
            <div class="text-[10px] text-text-weak font-bold uppercase tracking-wider mt-2">
              {language.locale() === "zh" ? "最近使用与其它" : "Others"}
            </div>
            <div class="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
              <For each={otherModels()}>
                {(m) => (
                  <button
                    class="w-full text-left px-3 py-2.5 border border-transparent hover:border-border-weak rounded-xl flex justify-between items-center transition-all bg-background-base/50"
                    classList={{
                      "bg-primary/5 text-primary font-semibold border-primary/20": isSelected(m),
                    }}
                    onClick={() => {
                      model().set({ modelID: m.id, providerID: m.provider.id }, { recent: true });
                      props.onClose();
                    }}
                  >
                    <div class="flex flex-col">
                      <span class="text-xs">{m.name}</span>
                      <span class="text-[9px] text-text-weak">{m.provider.name}</span>
                    </div>
                    <Show when={isSelected(m)}>
                      <span class="text-xs">✓</span>
                    </Show>
                  </button>
                )}
              </For>
            </div>
          </Show>

          {/* 管理模型入口链接 */}
          <button 
            class="mt-3 py-2.5 border-t border-border-weak flex justify-between items-center text-xs text-text-muted hover:text-primary transition-colors font-medium"
            onClick={() => {
              props.onClose();
              props.onManageModels();
            }}
          >
            <span>{language.locale() === "zh" ? "管理可用模型列表" : "Manage Models List"}</span>
            <span class="text-[10px]">→</span>
          </button>
        </div>
      </div>
    </Show>
  );
}
