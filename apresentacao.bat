@echo off
setlocal EnableExtensions
chcp 65001 >nul
title API de Eventos Academicos - RBAC
cd /d "%~dp0"

set "URL=http://127.0.0.1:3000"

REM Modo direto: "apresentacao.bat 1" executa a opcao 1 sem mostrar o menu
set "DIRETO="
if not "%~1"=="" (
  set "DIRETO=1"
  set "op=%~1"
  goto escolha
)

:menu
cls
echo.
echo  ============================================================
echo     API DE EVENTOS ACADEMICOS - RBAC  ^|  Menu da apresentacao
echo  ============================================================
echo.
echo     1 - Ligar o sistema (Docker) e abrir o Swagger
echo     2 - Demonstracao guiada (passo a passo, com pausas)
echo     3 - Rodar testes automaticos (60 verificacoes de permissao)
echo     4 - Abrir o Swagger no navegador
echo     5 - Resetar o banco (volta aos dados iniciais)
echo     6 - Ver logs da API
echo     7 - Desligar o sistema
echo     0 - Sair
echo.
echo     Usuarios de teste (senha Senha@123):
echo       admin@universidade.edu  /  editor@universidade.edu  /  user@universidade.edu
echo.
set "op="
set /p "op=  Escolha uma opcao: "

:escolha
if "%op%"=="1" goto ligar
if "%op%"=="2" goto demo
if "%op%"=="3" goto testes
if "%op%"=="4" goto swagger
if "%op%"=="5" goto resetar
if "%op%"=="6" goto logs
if "%op%"=="7" goto desligar
if "%op%"=="0" exit /b 0
if defined DIRETO (
  echo  Opcao invalida: %op%  ^(use 0 a 7^)
  exit /b 1
)
goto menu

REM ------------------------------------------------------------------
:ligar
call :docker_ok || goto voltar
echo.
echo  Subindo PostgreSQL + API (a primeira vez pode levar alguns minutos)...
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo  [ERRO] Falha ao subir os containers.
  goto voltar
)
call :esperar_api || goto voltar
echo.
echo  [OK] Sistema no ar em %URL%
start "" "%URL%/api-docs"
goto voltar

REM ------------------------------------------------------------------
:demo
call :api_ok || goto voltar
call :node_ok || goto voltar
call :reset_silencioso
node scripts\demo.js
goto voltar

REM ------------------------------------------------------------------
:testes
call :api_ok || goto voltar
call :node_ok || goto voltar
call :reset_silencioso
echo.
node scripts\e2e.js
call :reset_silencioso
goto voltar

REM ------------------------------------------------------------------
:swagger
start "" "%URL%/api-docs"
if defined DIRETO exit /b 0
goto menu

REM ------------------------------------------------------------------
:resetar
call :docker_ok || goto voltar
call :reset_silencioso
if errorlevel 1 (echo  [ERRO] Nao foi possivel resetar. O sistema esta ligado? ) else (echo  [OK] Banco resetado para os dados iniciais.)
goto voltar

REM ------------------------------------------------------------------
:logs
echo  (Ctrl+C para sair dos logs)
docker compose logs -f --tail 50 api
if defined DIRETO exit /b 0
goto menu

REM ------------------------------------------------------------------
:desligar
docker compose down
echo  [OK] Sistema desligado.
goto voltar

REM ==================================================================
REM  Funcoes auxiliares
REM ==================================================================
:voltar
if defined DIRETO exit /b 0
echo.
pause
goto menu

:docker_ok
docker info >nul 2>&1 && exit /b 0
echo.
echo  Docker nao esta rodando. Tentando abrir o Docker Desktop...
if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
for /l %%i in (1,1,60) do (
  docker info >nul 2>&1 && (echo  [OK] Docker pronto. & exit /b 0)
  timeout /t 3 /nobreak >nul
)
echo  [ERRO] Docker nao iniciou. Abra o Docker Desktop manualmente e tente de novo.
exit /b 1

:esperar_api
echo  Aguardando a API responder...
for /l %%i in (1,1,60) do (
  curl -s -f "%URL%/health" >nul 2>&1 && exit /b 0
  timeout /t 2 /nobreak >nul
)
echo  [ERRO] A API nao respondeu. Veja os logs (opcao 6).
exit /b 1

:api_ok
curl -s -f "%URL%/health" >nul 2>&1 && exit /b 0
echo.
echo  [ERRO] A API nao esta no ar. Use primeiro a opcao 1.
exit /b 1

:node_ok
where node >nul 2>&1 && exit /b 0
echo.
echo  [ERRO] Node.js nao encontrado. Instale em https://nodejs.org
exit /b 1

:reset_silencioso
docker compose exec -T db psql -q -v ON_ERROR_STOP=1 -U postgres -d eventos < database\schema.sql >nul 2>&1
exit /b %errorlevel%
