@echo off
:: 切换当前 CMD 窗口的字符集为 UTF-8，防止中文显示乱码
chcp 65001 >nul

echo ==================================================
echo 🚀 正在为您将本地最新代码一键推送至 GitHub 云端仓库...
echo ==================================================
echo.

:: 1. 初始化 Git 并绑定远程仓库
git init >nul 2>&1
git remote remove origin >nul 2>&1
git remote add origin https://github.com/yxcl6666/Tauri-OpenCode.git
git branch -M main

:: 2. 添加并提交全部更改
git add .
git commit -m "feat: Android adaptation, JNI explicit launch, and cloud self-healing update" >nul 2>&1

echo.
echo --------------------------------------------------
echo 🌐 正在将最新代码强制推送至 GitHub [main] 分支...
echo 请保持网络畅通，首次推送可能会慢，请耐心等待 1-2 分钟...
echo --------------------------------------------------
echo.

git push -u origin main --force

if %ERRORLEVEL% equ 0 (
    echo.
    echo ==================================================
    echo 🎉 恭喜您，推送成功！最新代码已成功托管至：
    echo https://github.com/yxcl6666/Tauri-OpenCode
    echo ==================================================
) else (
    echo.
    echo ==================================================
    echo ❌ 推送失败，请检查以下两点：
    echo 1. 您的电脑网络连接是否正常。
    echo 2. 您是否在电脑上配置了该 GitHub 账号的推送权限
    echo    (您可以通过配置 GitHub Personal Access Token 进行授权认证)。
    echo ==================================================
)

echo.
pause
