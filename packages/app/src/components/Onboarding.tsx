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
  
  const [copied1, setCopied1] = createSignal(false)
  const [copied2, setCopied2] = createSignal(false)
  const [connectError, setConnectError] = createSignal("")
  const [connectValidating, setConnectValidating] = createSignal(false)
  const [inputShake, setInputShake] = createSignal(false)
  const [copiedHint, setCopiedHint] = createSignal(false)

  const handleLaunchTermux = async () => {
    // 1. 复制配置自愈命令
    handleCopy(commandText1, setCopied1)
    // 2. 气泡 Toast 提示展示 3 秒
    setCopiedHint(true)
    setTimeout(() => setCopiedHint(false), 3000)
    // 3. 跨应用强行在前台拉起 Termux 终端界面
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      await invoke("open_termux_app")
    } catch (err) {
      console.error("Failed to invoke open_termux_app:", err)
    }
  }

  const handleOpenTermuxSettings = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      await invoke("open_termux_settings")
    } catch (err) {
      console.error("Failed to invoke open_termux_settings:", err)
    }
  }

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

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {
        // Fallback for older webviews
        const input = document.createElement("textarea")
        input.value = text
        document.body.appendChild(input)
        input.select()
        document.execCommand("copy")
        document.body.removeChild(input)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  const handleDirectConnect = async () => {
    const url = customUrl().trim()
    if (!url) {
      setConnectError("请输入有效的服务器地址")
      setInputShake(true)
      setTimeout(() => setInputShake(false), 600)
      return
    }
    setConnectError("")
    setConnectValidating(true)
    const ok = await checkConnection(url)
    setConnectValidating(false)
    if (ok) {
      props.onSkip(url)
    } else {
      setConnectError("无法连接到该地址，请检查 URL 或确保后端已启动")
      setInputShake(true)
      setTimeout(() => setInputShake(false), 600)
    }
  }

  onMount(() => {
    startCheckingLoop()
  })

  // Extract hostname for local curl command helper
  const getPcIPPlaceholder = () => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname
      if (host && host !== "localhost" && host !== "127.0.0.1") return host
    }
    return "192.168.1.5"
  }

  const commandText1 = "bash ~/start-opencode.sh"
  const commandText2 = () => "curl -fsSL https://raw.githubusercontent.com/yxcl6666/Tauri-OpenCode/refs/heads/main/packages/mobile/scripts/start-opencode.sh -o ~/start-opencode.sh && chmod +x ~/start-opencode.sh && bash ~/start-opencode.sh"

  return (
    <div style={{
      display: "flex",
      "flex-direction": "column",
      "align-items": "center",
      "justify-content": "center",
      "min-height": "100vh",
      background: "#F8F8F8",
      color: "#171717",
      "font-family": "system-ui, -apple-system, sans-serif",
      padding: "24px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* V8 Ambient Pastel Glow Balls */}
      <div style={{
        position: "absolute",
        top: "12%",
        left: "-5%",
        width: "260px",
        height: "260px",
        background: "radial-gradient(circle, rgba(113, 82, 244, 0.07) 0%, transparent 70%)",
        "pointer-events": "none",
        "z-index": 0,
        animation: "float-slow 9s ease-in-out infinite"
      }} />
      <div style={{
        position: "absolute",
        bottom: "12%",
        right: "-5%",
        width: "300px",
        height: "300px",
        background: "radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)",
        "pointer-events": "none",
        "z-index": 0,
        animation: "float-reverse 11s ease-in-out infinite"
      }} />

      {/* V8 Card Container - STRICT 12px rounded */}
      <div style={{
        background: "#FFFFFF",
        border: "1px solid #EAEAEA",
        "border-radius": "12px",
        padding: "36px 24px",
        width: "100%",
        "max-width": "380px",
        "box-shadow": "0 8px 30px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)",
        "text-align": "center",
        "z-index": 1,
        animation: "fadeIn 0.5s cubic-bezier(0.25, 1, 0.5, 1) both"
      }}>
        {/* Title V8 alignment */}
        <h2 style={{
          "font-size": "1.65rem",
          "font-weight": "600",
          "letter-spacing": "-0.5px",
          margin: "0 0 4px 0",
          background: "linear-gradient(135deg, #7152f4 0%, #a855f7 100%)",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent"
        }}>
          Tauri OpenCode
        </h2>
        <p style={{
          "font-size": "0.72rem",
          color: "#6F6F6F",
          margin: "0 0 28px 0",
          "font-weight": "600",
          "letter-spacing": "1.5px"
        }}>
          MOBILE COOPERATIVE IDE BACKEND
        </p>

        {/* 1. Checking / Waking Status */}
        <Show when={status() === "checking" || status() === "waking"}>
          <div style={{ margin: "44px 0" }}>
            <div style={{
              position: "relative",
              width: "68px",
              height: "68px",
              margin: "0 auto"
            }}>
              <div class="pulse-ring" />
              <div class="spinner-orbit" />
              <div class="center-glow" />
            </div>
            <p style={{ "font-size": "0.88rem", color: "#171717", "margin-top": "24px", "font-weight": "600" }}>
              {status() === "checking" ? "正在检测本地服务..." : "正在唤醒 Termux 终端..."}
            </p>
            <p style={{ "font-size": "0.75rem", color: "#6F6F6F", "margin-top": "6px" }}>
              重试次数: <span style={{ color: "#7152f4", "font-weight": "bold" }}>{retryCount()}</span> / 6
            </p>
          </div>
        </Show>

        {/* 2. Connection Failed / Onboarding Guide */}
        <Show when={status() === "failed"}>
          <div style={{ "text-align": "left", margin: "16px 0" }}>
            <p style={{
              color: "#ef4444",
              "font-weight": "600",
              "font-size": "0.9rem",
              "text-align": "center",
              "margin-bottom": "16px"
            }}>
              ⚠️ 无法连接到本地 Termux 后端服务
            </p>
            
            {/* 一键智能自愈操作区 */}
            <div style={{
              display: "flex",
              "flex-direction": "column",
              gap: "8px",
              "margin-bottom": "16px"
            }}>
              <button
                class="onboarding-btn-primary"
                onClick={handleLaunchTermux}
                style={{
                  background: "linear-gradient(135deg, #7152f4 0%, #8b5cf6 100%)",
                  color: "white",
                  border: "none",
                  padding: "12px",
                  "border-radius": "9999px",
                  "font-weight": "600",
                  "font-size": "0.85rem",
                  cursor: "pointer",
                  "text-align": "center",
                  "box-shadow": "0 4px 14px rgba(113, 82, 244, 0.18)",
                  transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)"
                }}
              >
                🚀 一键拉起 Termux 终端并配置
              </button>

              <button
                class="onboarding-btn-secondary"
                onClick={handleOpenTermuxSettings}
                style={{
                  background: "transparent",
                  border: "1px solid #EAEAEA",
                  color: "#171717",
                  padding: "10px 14px",
                  "border-radius": "9999px",
                  "font-size": "0.78rem",
                  "font-weight": "600",
                  cursor: "pointer",
                  "text-align": "center",
                  transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)"
                }}
              >
                ⚙️ 无法关联启动？一键直达权限页
              </button>
            </div>

            {/* Step container */}
            <div style={{
              "font-size": "0.8rem",
              color: "#6F6F6F",
              background: "#F8F8F8",
              padding: "16px",
              "border-radius": "8px",
              border: "1px solid #EAEAEA",
            }}>
              <p style={{ "font-weight": "600", margin: "0 0 12px 0", color: "#171717", "font-size": "0.85rem" }}>配置诊断与环境自愈：</p>
              
              <div style={{ display: "flex", "flex-direction": "column", gap: "12px" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div class="step-badge">1</div>
                  <div style={{ "line-height": "1.4", "font-size": "0.78rem" }}>
                    请确保您的 Android 手机上已安装了 **Termux** 应用。
                  </div>
                </div>
                
                {/* Step 2 with copy utility */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <div class="step-badge">2</div>
                  <div style={{ "line-height": "1.4", width: "100%", "font-size": "0.78rem" }}>
                    打开 Termux 挂后台，并粘贴执行自愈启动命令：
                    <div class="code-box-wrapper">
                      <code>{commandText1}</code>
                      <button 
                        class="copy-btn" 
                        onClick={() => handleCopy(commandText1, setCopied1)}
                      >
                        {copied1() ? "已复制 ✔" : "复制"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 3 with copy utility */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <div class="step-badge">3</div>
                  <div style={{ "line-height": "1.4", width: "100%", "font-size": "0.78rem" }}>
                    若提示找不到脚本，执行备用下载自愈命令：
                    <div class="code-box-wrapper">
                      <code class="code-blue">{commandText2()}</code>
                      <button 
                        class="copy-btn" 
                        onClick={() => handleCopy(commandText2(), setCopied2)}
                      >
                        {copied2() ? "已复制 ✔" : "复制"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* V8 Stadium Round Buttons (9999px) */}
            <div style={{ "margin-top": "20px", display: "flex", "flex-direction": "column", gap: "10px" }}>
              <button
                class="onboarding-btn-primary"
                onClick={startCheckingLoop}
                style={{
                  background: "#7152f4",
                  color: "white",
                  border: "none",
                  padding: "12px",
                  "border-radius": "9999px",
                  "font-weight": "600",
                  "font-size": "0.85rem",
                  cursor: "pointer",
                  "text-align": "center",
                  "box-shadow": "0 4px 12px rgba(113, 82, 244, 0.15)"
                }}
              >
                重新检测与联通
              </button>
              
              <div style={{ display: "flex", gap: "8px", "margin-top": "2px" }}>
                <input
                  type="text"
                  value={customUrl()}
                  onInput={(e) => {
                    setCustomUrl(e.currentTarget.value)
                    setConnectError("")
                  }}
                  class={`onboarding-input ${connectError() ? "input-error" : ""} ${inputShake() ? "shake" : ""}`}
                  style={{
                    flex: 1,
                    background: "#FFFFFF",
                    border: connectError() ? "1px solid rgba(239, 68, 68, 0.45)" : "1px solid #E2E2E2",
                    "border-radius": "9999px",
                    color: "#171717",
                    padding: "8px 16px",
                    "font-size": "0.82rem",
                    ...(connectError() ? { "box-shadow": "0 0 0 3px rgba(229, 72, 77, 0.08)" } : {})
                  }}
                  placeholder="http://127.0.0.1:19130"
                />
                <button
                  class="onboarding-btn-secondary"
                  onClick={handleDirectConnect}
                  disabled={connectValidating()}
                  style={{
                    background: "transparent",
                    border: "1px solid #E2E2E2",
                    color: connectValidating() ? "#A0A0A0" : "#171717",
                    padding: "8px 16px",
                    "border-radius": "9999px",
                    "font-size": "0.82rem",
                    "font-weight": "500",
                    cursor: connectValidating() ? "not-allowed" : "pointer",
                    "white-space": "nowrap"
                  }}
                >
                  {connectValidating() ? "验证中..." : "直接连接"}
                </button>
              </div>
              <Show when={connectError()}>
                <div style={{
                  background: "rgba(254, 226, 226, 0.45)",
                  border: "1px solid rgba(239, 68, 68, 0.15)",
                  "border-radius": "8px",
                  padding: "8px 12px",
                  "margin-top": "10px",
                  display: "flex",
                  "align-items": "center",
                  gap: "6px",
                  animation: "fadeIn 0.3s ease"
                }}>
                  <span style={{ "font-size": "11px", "flex-shrink": 0 }}>⚠️</span>
                  <span style={{
                    color: "#df3434",
                    "font-size": "11px",
                    "font-weight": "500",
                    "text-align": "left",
                    "line-height": "1.4"
                  }}>
                    {connectError()}
                  </span>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* V8 高阶悬浮微 Toast 提示气泡 */}
        <Show when={copiedHint()}>
          <div style={{
            position: "absolute",
            bottom: "36px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(253, 242, 242, 0.96)",
            border: "1px solid rgba(113, 82, 244, 0.25)",
            color: "#7152f4",
            padding: "10px 18px",
            "border-radius": "9999px",
            display: "flex",
            "align-items": "center",
            gap: "8px",
            "font-size": "0.78rem",
            "font-weight": "600",
            "box-shadow": "0 8px 24px rgba(113, 82, 244, 0.15)",
            "z-index": "99999",
            "backdrop-filter": "blur(8px)",
            "-webkit-backdrop-filter": "blur(8px)",
            animation: "toast-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both"
          }}>
            <span>🚀</span>
            <span>自愈命令已自动复制，长按粘贴即可</span>
          </div>
        </Show>
      </div>

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(12px, -15px) scale(1.03); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translate(0, 0) scale(1.03); }
          50% { transform: translate(-15px, 12px) scale(0.97); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: scale(0.85); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 0.3; }
          100% { transform: scale(1.22); opacity: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(0.94); }
          50% { opacity: 0.85; transform: scale(1.06); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .pulse-ring {
          position: absolute;
          inset: 0;
          border: 2px solid rgba(113, 82, 244, 0.25);
          border-radius: 50%;
          animation: pulse 2.2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }
        .spinner-orbit {
          position: absolute;
          inset: 6px;
          border: 3.5px solid transparent;
          border-top-color: #7152f4;
          border-bottom-color: #a855f7;
          border-radius: 50%;
          animation: spin 1.4s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }
        .center-glow {
          position: absolute;
          inset: 22px;
          background: radial-gradient(circle, rgba(113, 82, 244, 0.6) 0%, transparent 75%);
          border-radius: 50%;
          animation: pulse-glow 2.2s ease-in-out infinite;
        }
        .step-badge {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(113, 82, 244, 0.1);
          color: #7152f4;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .code-box-wrapper {
          position: relative;
          background: #171717;
          border-radius: 6px;
          margin-top: 6px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        code {
          color: #34d399;
          padding: 8px 12px 30px 12px;
          font-size: 10.5px;
          line-height: 1.4;
          word-break: break-all;
          white-space: pre-wrap;
          font-family: Consolas, Monaco, monospace;
        }
        code.code-blue {
          color: #60a5fa;
        }
        .copy-btn {
          position: absolute;
          right: 6px;
          bottom: 6px;
          background: rgba(255, 255, 255, 0.12);
          border: none;
          color: #E2E8F0;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .copy-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .copy-btn:active {
          transform: scale(0.95);
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(5px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(1px); }
        }
        .shake {
          animation: shake 0.5s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .input-error {
          border-color: #ef4444 !important;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.15) !important;
        }
        .input-error:focus {
          border-color: #ef4444 !important;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.2) !important;
        }
        .onboarding-btn-primary {
          transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .onboarding-btn-primary:active {
          transform: scale(0.97);
          filter: brightness(0.92);
        }
        .onboarding-btn-secondary {
          transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .onboarding-btn-secondary:active {
          transform: scale(0.97);
          background: rgba(0, 0, 0, 0.03);
        }
        .onboarding-btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .onboarding-input {
          transition: all 0.25s ease;
        }
        .onboarding-input:focus {
          border-color: rgba(113, 82, 244, 0.5) !important;
          box-shadow: 0 0 10px rgba(113, 82, 244, 0.15);
          outline: none;
        }
        @keyframes toast-pop {
          from { opacity: 0; transform: translate(-50%, 15px) scale(0.92); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>
    </div>
  )
}
