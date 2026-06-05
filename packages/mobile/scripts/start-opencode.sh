#!/data/data/com.termux/files/usr/bin/bash

# Termux 启动 OpenCode 移动后台服务脚本
echo "正在启动 OpenCode 移动端后台服务..."

# 1. 寻找代码库目录，支持 ~/projects/opencode-dev 和 ~/opencode-dev
if [ -d "$HOME/projects/opencode-dev" ]; then
    cd "$HOME/projects/opencode-dev"
elif [ -d "$HOME/opencode-dev" ]; then
    cd "$HOME/opencode-dev"
else
    echo "错误: 未找到 opencode-dev 项目目录。请确保放置在 ~/projects/opencode-dev 或 ~/opencode-dev 路径下。"
    exit 1
fi

# 2. 检测运行环境并启动服务 (端口 19130)
PORT=19130
if command -v bun &> /dev/null; then
    echo "检测到 Bun 运行环境，正在通过 Bun 启动服务于端口 $PORT..."
    bun run dev serve --port $PORT
elif command -v node &> /dev/null; then
    echo "检测到 Node.js 运行环境，正在通过 tsx 启动服务于端口 $PORT..."
    npx tsx --conditions=browser packages/opencode/src/index.ts serve --port $PORT
else
    echo "错误: 手机上未安装 Bun 或 Node.js，请先在 Termux 中安装。"
    exit 1
fi
