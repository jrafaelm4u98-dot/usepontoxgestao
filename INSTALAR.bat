@echo off
title USEPONTOX - Instalador
color 0B
echo.
echo  ============================================
echo   UsePontoX - Instalador Automatico
echo  ============================================
echo.

REM ── Detecta Python ────────────────────────────────────────────────────
set PYEXE=

where py >nul 2>&1
if not errorlevel 1 ( set PYEXE=py & goto :pyok )

where python >nul 2>&1
if not errorlevel 1 ( set PYEXE=python & goto :pyok )

where python3 >nul 2>&1
if not errorlevel 1 ( set PYEXE=python3 & goto :pyok )

echo [ERRO] Python nao encontrado!
echo Instale Python 3.10+ em https://python.org
echo Marque "Add Python to PATH" durante a instalacao.
pause & exit /b 1
:pyok
echo Python detectado: %PYEXE%

REM ── Verifica Node.js ──────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado!
    echo Instale o Node.js em https://nodejs.org
    pause & exit /b 1
)
echo Node.js OK

echo.
echo [1/4] Instalando dependencias Python...
%PYEXE% -m pip install fastapi uvicorn sqlalchemy pywebview pandas openpyxl pyxlsb playwright passlib[bcrypt] python-jose python-multipart supabase python-dotenv thefuzz python-Levenshtein --quiet
if errorlevel 1 ( echo [ERRO] Falha pip. & pause & exit /b 1 )

echo [2/4] Instalando navegadores Playwright...
%PYEXE% -m playwright install chromium

echo [3/4] Instalando dependencias do frontend...
cd frontend
call npm install --silent
if errorlevel 1 ( echo [ERRO] Falha npm install. & pause & exit /b 1 )

echo [4/4] Compilando interface...
call npm run build
if errorlevel 1 ( echo [ERRO] Falha npm build. & pause & exit /b 1 )
cd ..

REM ── Libera porta 8000 no Firewall ─────────────────────────────────────
netsh advfirewall firewall show rule name="UsePontoX-8000" >nul 2>&1
if errorlevel 1 (
    echo Liberando porta 8000 no Firewall...
    netsh advfirewall firewall add rule name="UsePontoX-8000" dir=in action=allow protocol=TCP localport=8000 >nul
)

echo.
echo  ============================================
echo   Instalacao concluida com sucesso!
echo  ============================================
echo.
echo  Desktop:    clique em INICIAR_SISTEMA.bat
echo  Rede/Outro: clique em INICIAR_SERVIDOR_REDE.bat
echo.
pause
