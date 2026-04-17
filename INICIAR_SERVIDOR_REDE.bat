@echo off
title UsePontoX - Servidor de Rede
color 0A

REM ── Libera porta 8000 no Firewall do Windows ────────────────────────────
netsh advfirewall firewall show rule name="UsePontoX-8000" >nul 2>&1
if errorlevel 1 (
    echo Liberando porta 8000 no Firewall do Windows...
    netsh advfirewall firewall add rule name="UsePontoX-8000" dir=in action=allow protocol=TCP localport=8000 >nul
    echo Porta liberada!
)

REM ── Obtém o IP local da rede ────────────────────────────────────────────
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r "IPv4.*192\."') do (
    set "LOCAL_IP=%%a"
    goto :found
)
REM fallback: pega qualquer IPv4
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
    set "LOCAL_IP=%%a"
    goto :found
)
:found
set LOCAL_IP=%LOCAL_IP: =%

echo.
echo  ============================================
echo   UsePontoX - MODO REDE
echo  ============================================
echo.
echo  Acesse de qualquer PC na mesma rede:
echo.
echo     http://%LOCAL_IP%:8000
echo.
echo  Mantenha essa janela aberta enquanto usar.
echo  Feche esta janela para encerrar o servidor.
echo  ============================================
echo.

REM ── Detecta o executável Python disponível ─────────────────────────────
set PYEXE=

where py >nul 2>&1
if not errorlevel 1 (
    set PYEXE=py
    goto :runserver
)

where python >nul 2>&1
if not errorlevel 1 (
    set PYEXE=python
    goto :runserver
)

where python3 >nul 2>&1
if not errorlevel 1 (
    set PYEXE=python3
    goto :runserver
)

echo [ERRO] Python nao encontrado nesta maquina!
echo Instale o Python 3.10+ em https://python.org
echo Certifique-se de marcar "Add Python to PATH" durante a instalacao.
pause
exit /b 1

:runserver
echo Iniciando servidor com: %PYEXE%
echo.
%PYEXE% servidor_rede.py
pause
