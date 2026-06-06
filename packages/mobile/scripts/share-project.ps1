# share-project.ps1
# 电脑端一键打包并局域网分享项目脚本

$ProjectRoot = Resolve-Path "$PSScriptRoot\..\..\.." # 指向 opencode-dev 的根目录
$TempDir = "$env:TEMP\opencode-temp-build"
$ZipPath = "$ProjectRoot\opencode-dev.zip"

Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "📦 正在为您打包项目代码（排除 node_modules 等大文件）..." -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Cyan

# 清理旧文件
if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }

# 创建临时目录
New-Item -ItemType Directory -Path $TempDir | Out-Null

# 复制需要的文件 (彻底、干净地递归排除子包的 node_modules、.git 等大依赖)
Get-ChildItem -Path $ProjectRoot -Recurse | Where-Object {
    $_.FullName -notmatch "node_modules" -and
    $_.FullName -notmatch "target" -and
    $_.FullName -notmatch "\\\.git" -and
    $_.FullName -notmatch "\\\.svelte-kit" -and
    $_.FullName -notmatch "opencode-dev\.zip" -and
    $_.FullName -notmatch "\\\.gemini"
} | ForEach-Object {
    # 计算相对路径，以便在临时目录中维持正确的目录层级
    $RelativePath = $_.FullName.Substring($ProjectRoot.Length + 1)
    if ([string]::IsNullOrEmpty($RelativePath)) { return }
    $Dest = Join-Path $TempDir $RelativePath
    
    if ($_.PSIsContainer) {
        if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Path $Dest | Out-Null }
    } else {
        $ParentDir = Split-Path $Dest
        if (-not (Test-Path $ParentDir)) { New-Item -ItemType Directory -Path $ParentDir | Out-Null }
        Copy-Item -Path $_.FullName -Destination $Dest -Force
    }
}

# 压缩
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipPath -Force

# 清理临时目录
Remove-Item -Recurse -Force $TempDir

# 获取局域网 IP
$IPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -ExpandProperty IPAddress
$PreferredIP = $IPs[0] # 选第一个

Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host "🎉 打包完成！生成了: $ZipPath" -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host "🌐 局域网分享服务正在启动，请勿关闭此窗口。" -ForegroundColor Yellow
Write-Host "您电脑的局域网 IP 是: $PreferredIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "👉 请确保手机和电脑连接在同一个 Wi-Fi（局域网）下。" -ForegroundColor Yellow
Write-Host "--------------------------------------------------" -ForegroundColor Yellow

# 启动简单的 HTTP 服务
$Port = 8000

if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "检测到系统已安装 Python，正在通过 Python 启动分享服务于端口 $Port..." -ForegroundColor Cyan
    python -m http.server $Port --directory $ProjectRoot
} else {
    Write-Host "未检测到 Python，正在通过 PowerShell 原生 HttpListener 启动分享服务于端口 $Port..." -ForegroundColor Cyan
    
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://*:$Port/")
    try {
        $listener.Start()
    } catch {
        Write-Host "启动服务失败: 端口 $Port 可能被占用，或者需要管理员权限。错误: $_" -ForegroundColor Red
        return
    }
    
    Write-Host "PowerShell 分享服务运行中，按 Ctrl+C 退出..." -ForegroundColor Yellow
    
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            $urlPath = $request.Url.LocalPath.TrimStart('/')
            if ($urlPath -eq "opencode-dev.zip") {
                $fileBytes = [System.IO.File]::ReadAllBytes($ZipPath)
                $response.ContentType = "application/zip"
                $response.ContentLength64 = $fileBytes.Length
                $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
                Write-Host "✅ 手机成功下载了项目压缩包！" -ForegroundColor Green
            } else {
                $response.StatusCode = 404
                $writer = New-Object System.IO.StreamWriter($response.OutputStream)
                $writer.Write("Not Found")
                $writer.Flush()
            }
            $response.Close()
        } catch {
            # 捕获异常继续监听
        }
    }
}
