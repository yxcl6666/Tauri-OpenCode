import { createEffect, onCleanup, Show } from "solid-js";
import { useLanguage } from "@/context/language";

interface PopoverProps {
  isOpen: () => boolean;
  onClose: () => void;
  anchorEl: () => HTMLElement | undefined;
}

export function MobileLanguagePopover(props: PopoverProps) {
  const language = useLanguage();
  let popoverRef: HTMLDivElement | undefined;

  // 根据宿主元素（Anchor）的矩形区域，动态进行 fixed 坐标定位
  createEffect(() => {
    if (!props.isOpen() || !popoverRef) return;
    const anchor = props.anchorEl();
    if (!anchor) return;
    
    const rect = anchor.getBoundingClientRect();
    popoverRef.style.display = "flex";
    
    const popoverWidth = popoverRef.offsetWidth;
    
    // 定位在触发按钮的右下侧对齐，间距 4px
    popoverRef.style.left = `${rect.right - popoverWidth}px`;
    popoverRef.style.top = `${rect.bottom + window.scrollY + 4}px`;
  });

  // 监听全局指针事件，当点击外部区域时关闭气泡
  const handleOutsideClick = (e: MouseEvent) => {
    const anchor = props.anchorEl();
    if (
      props.isOpen() &&
      popoverRef &&
      !popoverRef.contains(e.target as Node) &&
      anchor &&
      !anchor.contains(e.target as Node)
    ) {
      props.onClose();
    }
  };

  createEffect(() => {
    if (props.isOpen()) {
      window.addEventListener("click", handleOutsideClick);
    } else {
      window.removeEventListener("click", handleOutsideClick);
    }
  });

  onCleanup(() => {
    window.removeEventListener("click", handleOutsideClick);
  });

  return (
    <Show when={props.isOpen()}>
      <div
        ref={popoverRef}
        class="fixed bg-background-strong border border-border-weak rounded-xl shadow-lg p-1.5 flex flex-col gap-0.5 z-[999] w-32 select-none"
        style={{ display: "none" }}
      >
        <button
          class="w-full text-left px-3 py-2 text-xs rounded-lg flex justify-between items-center hover:bg-background-base"
          classList={{ "text-primary font-semibold": language.locale() === "zh" }}
          onClick={(e) => {
            e.stopPropagation();
            language.setLocale("zh");
            props.onClose();
          }}
        >
          <span>简体中文</span>
          <Show when={language.locale() === "zh"}>
            <span class="text-[10px] text-primary">✓</span>
          </Show>
        </button>
        
        <button
          class="w-full text-left px-3 py-2 text-xs rounded-lg flex justify-between items-center hover:bg-background-base"
          classList={{ "text-primary font-semibold": language.locale() === "en" }}
          onClick={(e) => {
            e.stopPropagation();
            language.setLocale("en");
            props.onClose();
          }}
        >
          <span>English</span>
          <Show when={language.locale() === "en"}>
            <span class="text-[10px] text-primary">✓</span>
          </Show>
        </button>
        
        {/* 为将来增加语言预留接口 */}
        <div class="px-3 py-2 text-[10px] text-text-weak opacity-40 select-none border-t border-border-weaker mt-1 pt-1">
          日本語 (Soon)
        </div>
      </div>
    </Show>
  );
}
