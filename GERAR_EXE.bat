@echo off
title UsePontoX - Gerador de Instalador
color 0E
echo.
echo  ============================================
echo   UsePontoX - Gerando Instalador Windows
echo  ============================================
echo.

REM ── Detecta Python ───────────────────────────────────────────────────────
set PYEXE=
where py >nul 2>&1 && set PYEXE=py && goto :pyok
where python >nul 2>&1 && set PYEXE=python && goto :pyok
echo [ERRO] Python nao encontrado.
pause & exit /b 1
:pyok
echo Python: %PYEXE%

if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist "C:\Program Files\Inno Setup 6\ISCC.exe"       set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" set "ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"

if "%ISCC%"=="" (
    echo Inno Setup nao encontrado. Instalando via winget...
    winget install JRSoftware.InnoSetup --silent --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
        echo [AVISO] winget falhou. Baixe manualmente em:
        echo https://jrsoftware.org/isdl.php
        echo Instale e execute este BAT novamente.
        pause & exit /b 1
    )
    REM Aguarda instalação terminar
    timeout /t 5 /nobreak >nul
    set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    if not exist "%ISCC%" set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
    echo Inno Setup instalado!
)
echo Inno Setup: "%ISCC%"
echo.

REM ── Passo 1: Build do Frontend ───────────────────────────────────────────
echo [1/4] Compilando interface React...
cd frontend
call npm run build
if errorlevel 1 ( echo [ERRO] Build frontend falhou. & pause & exit /b 1 )
cd ..
echo OK

REM ── Passo 2: PyInstaller ─────────────────────────────────────────────────
echo [2/4] Gerando executavel (PyInstaller)...
echo Isso pode levar varios minutos...
%PYEXE% -m pip install pyinstaller --quiet
%PYEXE% -m PyInstaller usepontox.spec --noconfirm --clean
if errorlevel 1 ( echo [ERRO] PyInstaller falhou. & pause & exit /b 1 )
echo OK

REM ── Passo 3: Copia banco de dados ────────────────────────────────────────
echo [3/4] Preparando banco de dados inicial...
if not exist "dist\UsePontoX\financeiro_m4u.db" (
    copy "financeiro_m4u.db" "dist\UsePontoX\financeiro_m4u.db" >nul 2>&1
)
echo OK

REM ── Passo 4: Inno Setup ──────────────────────────────────────────────────
echo [4/4] Compilando instalador com Inno Setup...
if not exist "installer_output" mkdir installer_output
"%ISCC%" usepontox_setup.iss
if errorlevel 1 ( echo [ERRO] Inno Setup falhou. & pause & exit /b 1 )
echo OK

echo.
echo  ============================================
echo   INSTALADOR CRIADO COM SUCESSO!
echo  ============================================
echo.
echo  Arquivo: installer_output\UsePontoX_Setup.exe
echo.
echo  Distribua este arquivo para qualquer pessoa.
echo  Na 1a abertura, o Chromium sera baixado
echo  automaticamente (~150MB).
echo.
explorer installer_output
pause
