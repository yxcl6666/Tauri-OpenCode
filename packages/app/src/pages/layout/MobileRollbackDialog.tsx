import { For, Show } from "solid-js";
import { useLanguage } from "@/context/language";

export interface FileChange {
  path: string;
  type: "delete" | "modify" | "create";
}

interface RollbackDialogProps {
  isOpen: () => boolean;
  onClose: () => void;
  onConfirm: () => void;
  changes: () => FileChange[];
}

export function MobileRollbackDialog(props: RollbackDialogProps) {
  const language = useLanguage();

  return (
    <Show when={props.isOpen()}>
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
        <div class="bg-background-strong border border-border-weak rounded-2xl p-5 w-full max-w-[310px] flex flex-col gap-4 shadow-xl">
          <div class="flex justify-between items-center">
            <span class="font-bold text-sm">
              {language.locale() === "zh" ? "确认撤销" : "Confirm Undo"}
            </span>
            <button class="text-text-muted hover:text-text-strong" onClick={props.onClose}>✕</button>
          </div>
          
          <div class="text-xs text-text-muted leading-relaxed">
            {language.locale() === "zh" 
              ? "确认此撤销操作将对工作区带来以下变更：" 
              : "Confirming this undo action will apply the following workspace changes:"}
          </div>
          
          <div class="bg-background-base border border-border-weak rounded-xl p-2.5 flex flex-col gap-2 max-h-[140px] overflow-y-auto no-scrollbar">
            <For each={props.changes()}>
              {(change) => (
                <div class="flex justify-between items-center text-xs">
                  <span class="font-mono text-text-strong truncate max-w-[170px]">{change.path}</span>
                  <span 
                    classList={{
                      "px-1.5 py-0.5 rounded text-[10px] font-bold": true,
                      "bg-red-500/10 text-red-500": change.type === "delete",
                      "bg-orange-500/10 text-orange-500": change.type === "modify",
                      "bg-green-500/10 text-green-500": change.type === "create",
                    }}
                  >
                    {change.type === "delete" 
                      ? (language.locale() === "zh" ? "删除" : "Delete") 
                      : change.type === "modify" 
                      ? (language.locale() === "zh" ? "修改" : "Modify") 
                      : (language.locale() === "zh" ? "新增" : "Create")}
                  </span>
                </div>
              )}
            </For>
          </div>
          
          <div class="flex justify-end gap-2 mt-1">
            <button 
              class="px-4 py-2 rounded-lg text-xs font-semibold bg-background-base text-text-strong hover:opacity-90 transition-opacity"
              onClick={props.onClose}
            >
              {language.locale() === "zh" ? "取消" : "Cancel"}
            </button>
            <button 
              class="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:opacity-90 transition-opacity"
              onClick={props.onConfirm}
            >
              {language.locale() === "zh" ? "确认" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
