@echo off
setlocal EnableExtensions
chcp 65001 >nul
title API de Eventos Academicos - RBAC
cd /d "%~dp0"

set "URL=http://127.0.0.1:3000"

REM Modo direto: "apresentacao.bat 1" executa a opcao 1 sem mostrar o menu
set "DIRETO="
set "op="
if not "%~1"=="" (
  set "DIRETO=1"
  set "op=%~1"
)
if "%op%"=="0" exit /b 0

REM ------------------------------------------------------------------
REM  Antes de tudo: verifica (e instala, se faltar) as ferramentas
REM ------------------------------------------------------------------
call :preparar
if errorlevel 1 exit /b 1
if defined DIRETO goto escolha

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
echo     8 - Verificar / instalar ferramentas de novo
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
if "%op%"=="8" goto ferramentas
if "%op%"=="0" exit /b 0
if defined DIRETO (
  echo  Opcao invalida: %op%  ^(use 0 a 8^)
  exit /b 1
)
goto menu

REM ------------------------------------------------------------------
:ligar
call :subir_sistema || goto voltar
start "" "%URL%/api-docs"
goto voltar

REM ------------------------------------------------------------------
:demo
call :garantir_api || goto voltar
call :reset_silencioso
call :rodar_node scripts/demo.js
goto voltar

REM ------------------------------------------------------------------
:testes
call :garantir_api || goto voltar
call :reset_silencioso
echo.
call :rodar_node scripts/e2e.js
call :reset_silencioso
goto voltar

REM ------------------------------------------------------------------
:swagger
call :garantir_api || goto voltar
start "" "%URL%/api-docs"
if defined DIRETO exit /b 0
goto menu

REM ------------------------------------------------------------------
:resetar
call :garantir_api || goto voltar
call :reset_silencioso
if errorlevel 1 (echo  [ERRO] Nao foi possivel resetar o banco.) else (echo  [OK] Banco resetado para os dados iniciais.)
goto voltar

REM ------------------------------------------------------------------
:logs
call :docker_ok || goto voltar
echo  (Ctrl+C para sair dos logs)
docker compose logs -f --tail 50 api
if defined DIRETO exit /b 0
goto menu

REM ------------------------------------------------------------------
:desligar
call :docker_ok || goto voltar
docker compose down
echo  [OK] Sistema desligado.
goto voltar

REM ------------------------------------------------------------------
:ferramentas
call :preparar
goto voltar

REM ==================================================================
REM  Funcoes auxiliares
REM ==================================================================
:voltar
if defined DIRETO exit /b 0
echo.
pause
goto menu

REM Verifica/instala ferramentas (scripts\setup.ps1). 0 = pronto, 1 = falhou, 3 = reiniciar
:preparar
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup.ps1"
set "SETUP=%errorlevel%"
call :atualizar_path
if "%SETUP%"=="0" exit /b 0
if "%SETUP%"=="3" (
  echo.
  choice /c SN /m "  Reiniciar o computador agora"
  if errorlevel 2 (
    echo  Reinicie quando puder e abra o apresentacao.bat de novo.
  ) else (
    shutdown /r /t 10 /c "Reiniciando para concluir a instalacao do WSL/Docker"
  )
  pause
  exit /b 1
)
echo.
echo  [ERRO] As ferramentas necessarias nao estao instaladas.
pause
exit /b 1

REM Programas recem-instalados nao aparecem no PATH desta janela: adiciona na mao
:atualizar_path
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%PATH%;%ProgramFiles%\nodejs"
if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" set "PATH=%PATH%;%ProgramFiles%\Docker\Docker\resources\bin"
if exist "%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe" set "PATH=%PATH%;%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin"
exit /b 0

:docker_ok
docker info >nul 2>&1 && exit /b 0
echo.
echo  Docker nao esta rodando. Abrindo o Docker Desktop...
echo  (Se for a primeira vez, aceite os termos de uso na janela do Docker.)
if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
for /l %%i in (1,1,100) do (
  docker info >nul 2>&1 && (echo  [OK] Docker pronto. & exit /b 0)
  ping -n 4 127.0.0.1 >nul
)
echo  [ERRO] Docker nao iniciou em 5 minutos.
echo         - Abra o Docker Desktop manualmente e veja se ha alguma mensagem.
echo         - Se aparecer erro de WSL: rode "wsl --update" como administrador e reinicie.
echo         - Se falar de virtualizacao: ative "Virtualization/VT-x/SVM" na BIOS.
exit /b 1

:subir_sistema
call :docker_ok || exit /b 1
echo.
echo  Subindo PostgreSQL + API (na primeira vez baixa as imagens, pode levar alguns minutos)...
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo  [ERRO] Falha ao subir os containers.
  exit /b 1
)
echo  Aguardando a API responder...
for /l %%i in (1,1,60) do (
  curl -s -f "%URL%/health" >nul 2>&1 && (echo  [OK] Sistema no ar em %URL% & exit /b 0)
  ping -n 3 127.0.0.1 >nul
)
echo  [ERRO] A API nao respondeu. Veja os logs (opcao 6).
exit /b 1

REM Se a API nao estiver no ar, liga sozinho
:garantir_api
curl -s -f "%URL%/health" >nul 2>&1 && exit /b 0
echo.
echo  A API ainda nao esta no ar. Ligando o sistema...
call :subir_sistema
exit /b %errorlevel%

REM Roda um script Node no Windows; se nao houver Node, roda dentro do container da API
:rodar_node
where node >nul 2>&1 && (
  node %*
  exit /b
)
echo  (Node.js nao encontrado no Windows: executando dentro do container da API)
docker compose exec api node %*
exit /b

:reset_silencioso
docker compose exec -T db psql -q -v ON_ERROR_STOP=1 -U postgres -d eventos < database\schema.sql >nul 2>&1
exit /b %errorlevel%
