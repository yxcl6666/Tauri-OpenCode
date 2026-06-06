#!/data/data/com.termux/files/usr/bin/bash

# Termux 启动 & 环境自愈脚本
echo "=================================================="
echo "🚀 正在检查并准备 Tauri OpenCode 手机服务运行环境..."
echo "=================================================="

# 1. 自动开启外部应用控制权限，并重载设置
mkdir -p ~/.termux
if ! grep -q "allow-external-apps = true" ~/.termux/termux.properties 2>/dev/null; then
    echo "正在为您开启 Termux 外部应用调用权限..."
    echo "allow-external-apps = true" >> ~/.termux/termux.properties
    termux-reload-settings
fi

# 2. 检测网络与软件源更新 (防卡顿)
echo "正在检测软件源可用性..."
# 针对 NO_PUBKEY 问题进行自动公钥修复
if apt update 2>&1 | grep -q "NO_PUBKEY"; then
    echo "⚠️ 检测到 Termux 软件源公钥缺失，正在尝试自动下载并配置信任密钥..."
    mkdir -p $PREFIX/etc/apt/trusted.gpg.d/
    curl -fsSL https://github.com/termux/termux-keyring/raw/master/keyring.gpg -o $PREFIX/etc/apt/trusted.gpg.d/termux-keyring.gpg 2>/dev/null
    apt update -y &> /dev/null
fi

# 测试更新软件列表，如果失败自动尝试换源
if ! apt update -y &> /dev/null; then
    echo "⚠️ 默认软件源更新失败，正在自动为您优化并切换为清华镜像源以提升下载速度..."
    sed -i 's|packages.termux.org|mirrors.tuna.tsinghua.edu.cn/termux|g' $PREFIX/etc/apt/sources.list
    apt update -y
fi

# 3. 自愈安装所需的基础系统依赖
DEPENDENCIES=("node" "git" "unzip" "psmisc")
PKGS_TO_INSTALL=()

for dep in "${DEPENDENCIES[@]}"; do
    if [ "$dep" = "node" ]; then
        if ! command -v node &> /dev/null; then
            PKGS_TO_INSTALL+=("nodejs-lts")
        fi
    elif [ "$dep" = "psmisc" ]; then
        if ! command -v fuser &> /dev/null; then
            PKGS_TO_INSTALL+=("psmisc")
        fi
    else
        if ! command -v $dep &> /dev/null; then
            PKGS_TO_INSTALL+=("$dep")
        fi
    fi
done

if [ ${#PKGS_TO_INSTALL[@]} -ne 0 ]; then
    echo "检测到缺失以下环境依赖: ${PKGS_TO_INSTALL[*]}"
    echo "正在为您自动安装，这可能需要一点时间，请保持网络连接..."
    pkg install -y "${PKGS_TO_INSTALL[@]}"
    if [ $? -ne 0 ]; then
        echo "⚠️ pkg 安装遇到障碍，正在尝试通过 apt 进行备用安装..."
        apt install -y "${PKGS_TO_INSTALL[@]}"
    fi
fi

# 验证安装是否成功
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 自动安装失败，请尝试在手机上重新打开 Termux 并手动输入 'pkg install nodejs-lts' 进行安装。"
    exit 1
fi

# 3.5. 自愈并配置 Bun 运行环境
BUN_PATH="$HOME/.bun/bin/bun"
if ! command -v bun &> /dev/null && [ ! -f "$BUN_PATH" ]; then
    echo "⚡ 检测到缺失核心运行环境 Bun，正在为您自动下载并安装 Bun (Android aarch64 兼容版)..."
    curl -fsSL https://bun.sh/install | bash
    if [ $? -ne 0 ] || [ ! -f "$BUN_PATH" ]; then
        echo "⚠️ 官方安装脚本失败，正在尝试通过 npm 全局安装备用 Bun 包..."
        npm install -g bun
    fi
fi

# 确保 bun 路径在 PATH 中
if [ -f "$BUN_PATH" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
fi

if ! command -v bun &> /dev/null; then
    echo "❌ 错误: Bun 自动安装失败，服务无法在 Node 下直接启动。请手动运行 'curl -fsSL https://bun.sh/install | bash' 安装 Bun。"
    exit 1
fi

# 4. 寻找或一键下载代码库目录
PROJECT_DIR=""
if [ -f "$HOME/projects/opencode-dev/packages/opencode/src/index.ts" ]; then
    PROJECT_DIR="$HOME/projects/opencode-dev"
elif [ -f "$HOME/opencode-dev/packages/opencode/src/index.ts" ]; then
    PROJECT_DIR="$HOME/opencode-dev"
fi

if [ -z "$PROJECT_DIR" ]; then
    echo "--------------------------------------------------"
    echo "❌ 未在 Termux 中检测到完整可用的 opencode-dev 项目目录。"
    echo "--------------------------------------------------"
    echo "💡 [代码库一键下载部署服务]："
    echo "  1. 从 GitHub 官方云端克隆 (推荐，跨网络任何地点均可使用)"
    echo "  2. 从电脑局域网同步下载 (需要电脑与手机在同一 Wi-Fi)"
    echo "--------------------------------------------------"
    read -p "👉 请选择部署方式 (输入 1 或 2，默认为 1): " choice
    if [ -z "$choice" ]; then
        choice="1"
    fi

    if [ "$choice" = "1" ]; then
        echo "正在从 GitHub 云端拉取最新的纯源码包 (https://github.com/yxcl6666/Tauri-OpenCode.git)..."
        # 清除残留以防 git clone 失败
        rm -rf "$HOME/opencode-dev"
        git clone "https://github.com/yxcl6666/Tauri-OpenCode.git" "$HOME/opencode-dev"
        if [ $? -ne 0 ]; then
            echo "❌ 云端克隆失败，请检查手机网络连接。"
            exit 1
        fi
        PROJECT_DIR="$HOME/opencode-dev"
    else
        read -p "👉 请在此处输入电脑上显示的局域网 IP 地址 (例如: 192.168.1.5): " pc_ip
        if [ -z "$pc_ip" ]; then
            echo "未输入 IP 地址，自愈程序退出。"
            exit 1
        fi
        echo "正在从电脑下载局域网瘦身压缩包 (http://$pc_ip:8000/opencode-dev.zip)..."
        curl -L -o ~/opencode-dev.zip "http://$pc_ip:8000/opencode-dev.zip"
        if [ $? -ne 0 ]; then
            echo "❌ 局域网下载失败！请确保手机和电脑在同一 Wi-Fi 下且电脑端分享已开启。"
            exit 1
        fi
        echo "🎉 下载成功！正在解压到 ~/opencode-dev 路径..."
        unzip -o ~/opencode-dev.zip -d ~/
        rm ~/opencode-dev.zip
        PROJECT_DIR="$HOME/opencode-dev"
    fi
fi

cd "$PROJECT_DIR"
echo "✅ 已成功定位项目目录: $PROJECT_DIR"

# 自动同步最新的代码仓 (如果是 git 仓库)
if [ -d ".git" ]; then
    echo "正在自动从 GitHub 同步最新修复代码..."
    git fetch --all &>/dev/null
    git reset --hard origin/main &>/dev/null
    git pull origin main &>/dev/null
fi

# 5. 自愈并安装依赖 (使用 Bun 极速安装)
# 检测到旧的 pnpm 残余 node_modules 时自动清理，防止软链接冲突
if [ -d "node_modules/.pnpm" ]; then
    echo "⚡ 检测到旧的 pnpm 残留依赖，正在为您自动清理以防止软链接冲突..."
    rm -rf node_modules packages/*/node_modules
fi

if [ ! -d "node_modules" ] || [ ! -d "packages/opencode/node_modules" ] || [ ! -d "packages/core/node_modules" ]; then
    echo "检测到 node_modules 缺失或不完整，正在使用 Bun 为您快速安装项目依赖..."
    bun install
fi

# 6. 自愈端口占用 (防止多次启动导致端口冲突)
PORT=19130
if command -v fuser &> /dev/null; then
    OCCUPIED_PID=$(fuser $PORT/tcp 2>/dev/null | awk '{print $NF}')
    if [ ! -z "$OCCUPIED_PID" ]; then
        echo "检测到端口 $PORT 已被进程占用，正在释放端口..."
        fuser -k $PORT/tcp &>/dev/null
        sleep 1
    fi
fi

# 7. 启动服务
echo "--------------------------------------------------"
echo "🚀 运行环境完全自愈成功，正在为您启动 OpenCode 后台服务..."
echo "👉 后台端口: $PORT"
echo "=================================================="

# 异步延时拉起前端 APP (给服务跑起来留出时间)
(
    sleep 2.5
    echo "⚡ 正在尝试反向强唤醒手机前端 APP..."
    if ! am start --user 0 -n ai.opencode.mobile.debug/ai.opencode.mobile.MainActivity &>/dev/null; then
        am start --user 0 -n ai.opencode.mobile/ai.opencode.mobile.MainActivity &>/dev/null
    fi
) &

# 进入 opencode 包目录并使用 Bun 启动服务
# Bun 原生支持 tsconfig.json 别名，且原生支持 bun:sqlite 等运行时依赖协议
cd "$PROJECT_DIR/packages/opencode"
bun run --conditions=browser src/index.ts serve --port $PORT --hostname 0.0.0.0
