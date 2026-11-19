@echo off
chcp 65001 >nul
REM ============================================================
REM  护花使者 · IoT 数据服务 一键启动脚本
REM ------------------------------------------------------------
REM  作用：启动接收 ESP32 上报数据的后台服务（FastAPI + SQLite）
REM  启动后访问：
REM     http://localhost:8001/docs       接口文档（Swagger）
REM     http://localhost:8001/dashboard  数据看板（网页，5秒自动刷新）
REM
REM  注意：ESP32 要访问本机的 8001 端口，Windows 防火墙需放行一次：
REM     （管理员 PowerShell 运行一次即可，永久生效）
REM     New-NetFirewallRule -DisplayName "护花使者IoT服务" -Direction Inbound ^
REM       -Protocol TCP -LocalPort 8001 -Action Allow -Profile Any
REM ============================================================

set PY=C:\Python314\python.exe
set PORT=8001

echo ============================================
echo   护花使者 IoT 数据服务
echo ============================================
echo.

if not exist "%PY%" (
    echo [错误] 未找到 Python：%PY%
    echo 请修改本脚本第 17 行的 PY 变量，指向你电脑上的 python.exe
    pause
    exit /b 1
)

echo 本机局域网 IP（填进 firmware/include/wifi_config.h 的 SERVER_HOST）：
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=* delims= " %%b in ("%%a") do echo     %%b
)
echo.
echo 服务地址：  http://localhost:%PORT%
echo 看板地址：  http://localhost:%PORT%/dashboard
echo 按 Ctrl+C 停止服务
echo ============================================
echo.

"%PY%" -m uvicorn iot_service.main:app --host 0.0.0.0 --port %PORT%

pause
