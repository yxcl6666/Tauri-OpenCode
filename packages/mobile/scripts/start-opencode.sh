#!/data/data/com.termux/files/usr/bin/bash

# ==================================================
# 🚀 Tauri OpenCode PRoot Debian 工业级自愈启动脚本
# ==================================================
echo "=================================================="
echo "🚀 正在检查并准备 Tauri OpenCode 手机服务运行环境 (PRoot 容器化)..."
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
    apt update -y &>/dev/null
fi

# 测试更新软件列表，如果失败自动尝试换源
if ! apt update -y &> /dev/null; then
    echo "⚠️ 默认软件源更新失败，正在自动为您优化并切换为清华镜像源以提升下载速度..."
    sed -i 's|packages.termux.org|mirrors.tuna.tsinghua.edu.cn/termux|g' $PREFIX/etc/apt/sources.list
    apt update -y
fi

# 3. 安装 PRoot 及其管理工具
echo "正在为您安装 Linux 容器管理服务 (proot-distro)..."
pkg install proot-distro git unzip psmisc -y

# 4. 确保 debian 容器已经成功安装
if ! proot-distro list | grep -q "installed.*debian"; then
    echo "⚡ 正在为您下载并安装 Debian 轻量级标准 Linux 容器..."
    echo "👉 首次下载大概需要 1-2 分钟，请保持网络连接..."
    proot-distro install debian
    if [ $? -ne 0 ]; then
        echo "❌ 错误: Debian 容器下载安装失败，请检查网络。"
        exit 1
    fi
fi

# 5. 寻找或一键下载代码库目录 (在 Termux 宿主机家目录下)
PROJECT_DIR=""
if [ -d "$HOME/projects/opencode-dev" ]; then
    PROJECT_DIR="$HOME/projects/opencode-dev"
elif [ -d "$HOME/opencode-dev" ]; then
    PROJECT_DIR="$HOME/opencode-dev"
fi

if [ -z "$PROJECT_DIR" ]; then
    echo "正在从 GitHub 云端拉取最新的源码 (https://github.com/yxcl6666/Tauri-OpenCode.git)..."
    git clone "https://github.com/yxcl6666/Tauri-OpenCode.git" "$HOME/opencode-dev"
    PROJECT_DIR="$HOME/opencode-dev"
fi

# 自动同步最新的代码仓
cd "$PROJECT_DIR"
echo "正在从 GitHub 同步最新修复代码..."
git fetch --all &>/dev/null
git reset --hard origin/main &>/dev/null
git pull origin main &>/dev/null

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

# 7. 异步等待 19130 端口成功监听后再拉起前端 APP
(
    echo "⚡ 后台正在等待端口 19130 被监听..."
    for i in {1..40}; do
        if (echo > /dev/tcp/127.0.0.1/19130) &>/dev/null; then
            echo "🎉 检测到后端端口 19130 已经成功启动监听！"
            break
        fi
        sleep 0.5
    done
    echo "⚡ 正在尝试反向强唤醒手机前端 APP..."
    if ! am start --user 0 -n ai.opencode.mobile.debug/ai.opencode.mobile.MainActivity &>/dev/null; then
        am start --user 0 -n ai.opencode.mobile/ai.opencode.mobile.MainActivity &>/dev/null
    fi
) &

# 8. 构造并生成子系统内运行的自愈与启动脚本
# 我们将 Termux 的 $HOME 挂载到 Debian 内部的 /root/home 下
cat << 'EOF' > ~/.start-inside-debian.sh
#!/bin/bash
export PATH="/root/.bun/bin:$PATH"

echo "=================================================="
echo "🐧 正在初始化 Debian 子系统依赖环境..."
echo "=================================================="

# 容器内软件源自检和更新
apt-get update &>/dev/null
apt-get install -y curl unzip git psmisc &>/dev/null

# 容器内安装官方 Bun 运行时 (在标准 Linux 容器下可完美运行，无 PIE 报错)
if ! command -v bun &> /dev/null; then
    echo "⚡ 正在容器内下载并安装 Bun 运行环境..."
    curl -fsSL https://bun.sh/install | bash
fi

# 确保 bun 命令有效
export PATH="/root/.bun/bin:$PATH"

if ! command -v bun &> /dev/null; then
    echo "❌ 错误: 容器内 Bun 安装失败。"
    exit 1
fi

# 进入挂载的项目路径并安装依赖
cd /root/home/opencode-dev

# 检测到 pnpm 脏依赖时自动清理 (防止软链接冲突)
if [ -d "node_modules/.pnpm" ]; then
    echo "⚡ 清理旧的 pnpm 残留依赖目录..."
    rm -rf node_modules packages/*/node_modules
fi

if [ ! -d "node_modules" ] || [ ! -d "packages/opencode/node_modules" ] || [ ! -d "packages/core/node_modules" ]; then
    echo "正在使用 Bun 快速安装/补齐项目依赖 (Debian aarch64 环境)..."
    bun install
fi

# 启动服务
cd packages/opencode
echo "--------------------------------------------------"
echo "🚀 OpenCode 后台服务已成功在 Linux 容器中启动！"
echo "👉 容器后台正在监听端口: 19130 (网络与 Termux 宿主机共享)"
echo "=================================================="
bun run --conditions=browser src/index.ts serve --port 19130 --hostname 0.0.0.0
EOF

chmod +x ~/.start-inside-debian.sh

# 9. 启动 Debian 容器并挂载 Termux 家目录执行启动逻辑
proot-distro login debian --shared-tmp --bind $HOME:/root/home -- bash /root/home/.start-inside-debian.sh
