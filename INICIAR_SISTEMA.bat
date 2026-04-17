@echo off
REM Garante que o diretório de trabalho é sempre a pasta do sistem
cd /d "%~dp0"
taskkill /F /IM pythonw.exe >nul 2>&1
taskkill /F /IM python.exe /FI "WINDOWTITLE eq USEPONTOX*" >nul 2>&1
set PYEXE=
where py >nul 2>&1
if not errorlevel 1 ( set PYEXE=py ) else (
    where python >nul 2>&1
    if not errorlevel 1 ( set PYEXE=python ) else (
        where python3 >nul 2>&1
        if not errorlevel 1 ( set PYEXE=python3 )
    )
)

if "%PYEXE%"=="" (
    echo [ERRO] Python nao encontrado. Por favor, instale o Python.
    pause
    exit
)

%PYEXE% main.py
pause
