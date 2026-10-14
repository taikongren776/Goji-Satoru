@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 20.19 或更新版本，再重新打开此文件。
  echo https://nodejs.org/
  pause
  exit /b 1
)
echo 正在启动五条悟技能展示台……
node scripts\serve.mjs --open
if errorlevel 1 pause
