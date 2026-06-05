import { createSignal, onMount, Show } from "solid-js"

interface OnboardingProps {
  serverUrl: string
  onConnected: () => void
  onSkip: (url: string) => void
}

export const Onboarding = (props: OnboardingProps) => {
  const [status, setStatus] = createSignal<"checking" | "waking" | "failed">("checking")
  const [retryCount, setRetryCount] = createSignal(0)
  const [customUrl, setCustomUrl] = createSignal(props.serverUrl)

  const isTauri = () => {
    return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  }

  const triggerTermuxWakeup = async () => {
    if (isTauri()) {
      try {
        const { invoke } = await import("@tauri-apps/api/core")
        await invoke("start_termux_backend")
      } catch (err) {
        console.error("Failed to invoke start_termux_backend:", err)
      }
    }
  }

  const checkConnection = async (url: string): Promise<boolean> => {
    try {
      const res = await fetch(url, { method: "GET", mode: "no-cors", credentials: "omit" })
      return true
    } catch (e) {
      return false
    }
  }

  const startCheckingLoop = async () => {
    setStatus("checking")
    setRetryCount(0)

    const ok = await checkConnection(props.serverUrl)
    if (ok) {
      props.onConnected()
      return
    }

    setStatus("waking")
    await triggerTermuxWakeup()

    const interval = setInterval(async () => {
      setRetryCount((c) => c + 1)
      const success = await checkConnection(props.serverUrl)
      if (success) {
        clearInterval(interval)
        props.onConnected()
      } else if (retryCount() >= 6) {
        clearInterval(interval)
        setStatus("failed")
      }
    }, 1200)
  }

  onMount(() => {
    startCheckingLoop()
  })

  return (
    <div style={{
      display: "flex",
      "flex-direction": "column",
      "align-items": "center",
      "justify-content": "center",
      "min-height": "100vh",
      background: "radial-gradient(circle at top, #1e293b 0%, #0f172a 100%)",
      color: "#e2e8f0",
      "font-family": "system-ui, -apple-system, sans-serif",
      padding: "24px"
    }}>
      <div style={{
        background: "rgba(30, 41, 59, 0.7)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        "border-radius": "16px",
        padding: "32px",
        width: "100%",
        "max-width": "420px",
        "box-shadow": "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
        "text-align": "center"
      }}>
        <h2 style={{
          "font-size": "1.6rem",
          "font-weight": "800",
          margin: "0 0 10px 0",
          background: "linear-gradient(135deg, #3b82f6, #10b981)",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent"
        }}>
          Tauri OpenCode
        </h2>

        {/* 1. Checking / Waking Status */}
        <Show when={status() === "checking" || status() === "waking"}>
          <div style={{ margin: "40px 0" }}>
            <div style={{
              width: "60px",
              height: "60px",
              border: "3px dashed #3b82f6",
              "border-radius": "50%",
              margin: "0 auto",
              animation: "spin 2s linear infinite"
            }} />
            <p style={{ "font-size": "0.95rem", color: "#cbd5e1", "margin-top": "24px" }}>
              {status() === "checking" ? "正在检测本地后台服务..." : "正在尝试唤醒 Termux 本地后端..."}
            </p>
            <p style={{ "font-size": "0.8rem", color: "#64748b", "margin-top": "8px" }}>
              尝试重试次数: {retryCount()} / 6
            </p>
          </div>
        </Show>

        {/* 2. Connection Failed / Onboarding Guide */}
        <Show when={status() === "failed"}>
          <div style={{ "text-align": "left", margin: "20px 0" }}>
            <p style={{
              color: "#f87171",
              "font-weight": "600",
              "font-size": "0.95rem",
              "text-align": "center",
              "margin-bottom": "16px"
            }}>
              ⚠️ 无法连接到本地 Termux 后端服务
            </p>
            
            <div style={{
              "font-size": "0.85rem",
              color: "#94a3b8",
              background: "rgba(2, 6, 23, 0.4)",
              padding: "16px",
              "border-radius": "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)"
            }}>
              <p style={{ "font-weight": "bold", margin: "0 0 8px 0", color: "#cbd5e1" }}>配置诊断步骤：</p>
              <ol style={{ "padding-left": "16px", margin: "0" }}>
                <li style={{ "margin-bottom": "6px" }}>请确保您已在手机上安装了 **Termux** 应用。</li>
                <li style={{ "margin-bottom": "6px" }}>
                  打开 Termux，进入 **Settings** ➔ **Advanced** ➔ 开启 **"Allow external applications to run commands"** 选项。
                </li>
                <li style={{ "margin-bottom": "6px" }}>
                  在 Termux 中执行过一键配置命令：
                  <code style={{
                    display: "block",
                    background: "#020617",
                    color: "#34d399",
                    padding: "6px",
                    "border-radius": "4px",
                    "margin-top": "4px",
                    "font-size": "0.75rem",
                    "word-break": "break-all"
                  }}>
                    curl -fsSL https://opencode.ai/install | bash
                  </code>
                </li>
              </ol>
            </div>

            <div style={{ "margin-top": "20px", display: "flex", "flex-direction": "column", gap: "10px" }}>
              <button
                onClick={startCheckingLoop}
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  color: "white",
                  border: "none",
                  padding: "12px",
                  "border-radius": "8px",
                  "font-weight": "600",
                  cursor: "pointer",
                  "text-align": "center"
                }}
              >
                重新检测与唤醒
              </button>
              
              <div style={{ display: "flex", gap: "10px", "margin-top": "6px" }}>
                <input
                  type="text"
                  value={customUrl()}
                  onInput={(e) => setCustomUrl(e.currentTarget.value)}
                  style={{
                    flex: 1,
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    "border-radius": "8px",
                    color: "white",
                    padding: "8px 12px",
                    "font-size": "0.85rem"
                  }}
                  placeholder="http://localhost:19130"
                />
                <button
                  onClick={() => props.onSkip(customUrl())}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#cbd5e1",
                    padding: "8px 16px",
                    "border-radius": "8px",
                    "font-size": "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  连接此地址
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
