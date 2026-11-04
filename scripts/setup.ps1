# =====================================================================
#  Verifica e instala as ferramentas necessarias para rodar o projeto.
#  Chamado pelo apresentacao.bat. Pode ser executado sozinho:
#    powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
#
#  Ferramentas:
#    - winget          (instalador de programas do Windows)
#    - WSL 2           (necessario para o Docker Desktop)
#    - Docker Desktop  (roda o PostgreSQL e a API)
#    - Node.js LTS     (roda a demonstracao e os testes no Windows)
#
#  Codigos de saida:
#    0 = tudo pronto
#    1 = falhou ou o usuario recusou a instalacao
#    3 = instalado, mas e preciso REINICIAR o computador
#
#  -Simular : mostra o que seria instalado, sem instalar nada (para testes)
#  -Sim     : nao pergunta, instala direto
# =====================================================================
param(
    [switch]$Simular,
    [switch]$Sim
)

$ErrorActionPreference = 'Continue'

function Escrever($texto, $cor = 'Gray') { Write-Host $texto -ForegroundColor $cor }
function Ok($texto)    { Write-Host "  [OK]    " -ForegroundColor Green -NoNewline; Write-Host $texto }
function Falta($texto) { Write-Host "  [FALTA] " -ForegroundColor Yellow -NoNewline; Write-Host $texto }
function Erro($texto)  { Write-Host "  [ERRO]  " -ForegroundColor Red -NoNewline; Write-Host $texto }

function Atualizar-Path {
    $maquina = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $usuario = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$maquina;$usuario"
}

# ---------------------------------------------------------------- testes
function Tem-Winget { [bool](Get-Command winget -ErrorAction SilentlyContinue) }

function Tem-Wsl {
    if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) { return $false }
    # "wsl --version" so funciona no WSL moderno (o que o Docker precisa)
    $null = & wsl --version 2>&1
    return ($LASTEXITCODE -eq 0)
}

function Caminho-Docker {
    $opcoes = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
    )
    foreach ($p in $opcoes) { if (Test-Path $p) { return $p } }
    return $null
}
function Tem-Docker { [bool](Caminho-Docker) -or [bool](Get-Command docker -ErrorAction SilentlyContinue) }

function Tem-Node {
    if (Get-Command node -ErrorAction SilentlyContinue) { return $true }
    return (Test-Path "$env:ProgramFiles\nodejs\node.exe")
}

# ---------------------------------------------------------------- instaladores
function Instalar-Winget {
    Escrever "`n  Instalando o winget (App Installer)..." Cyan
    try {
        # Na maioria dos Windows 10/11 ele ja vem, so precisa ser registrado
        Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe -ErrorAction Stop
    } catch {
        try {
            $arquivo = Join-Path $env:TEMP 'winget.msixbundle'
            Invoke-WebRequest -Uri 'https://aka.ms/getwinget' -OutFile $arquivo -UseBasicParsing
            Add-AppxPackage -Path $arquivo -ErrorAction Stop
        } catch {
            Erro "Nao foi possivel instalar o winget automaticamente."
            Escrever "          Abrindo a Microsoft Store: instale o 'App Installer' e rode o .bat de novo."
            Start-Process 'ms-windows-store://pdp/?productid=9NBLGGH4NNS1'
            return $false
        }
    }
    Atualizar-Path
    return (Tem-Winget)
}

function Winget-Instalar($id, $nome) {
    Escrever "`n  Instalando $nome (pode aparecer uma janela pedindo permissao de administrador)..." Cyan
    & winget install --id $id -e --source winget --accept-package-agreements --accept-source-agreements
    # 0 = ok ; -1978335189 = ja instalado / nada a atualizar
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1978335189) {
        Erro "winget terminou com codigo $LASTEXITCODE ao instalar $nome."
    }
    Atualizar-Path
}

function Instalar-Wsl {
    Escrever "`n  Instalando/atualizando o WSL (vai pedir permissao de administrador)..." Cyan
    $p = Start-Process -FilePath 'wsl.exe' -ArgumentList '--install', '--no-distribution' -Verb RunAs -Wait -PassThru
    $p2 = Start-Process -FilePath 'wsl.exe' -ArgumentList '--update' -Verb RunAs -Wait -PassThru
    if ($p.ExitCode -ne 0 -and $p2.ExitCode -ne 0) {
        Erro "Falha ao instalar o WSL (codigos $($p.ExitCode) / $($p2.ExitCode))."
    }
}

# ---------------------------------------------------------------- verificacao
Escrever "`n  Verificando ferramentas necessarias..." White
Escrever "  ------------------------------------------------------------"

$faltando = @()
if ($Simular) {
    $faltando = @('winget', 'WSL', 'Docker', 'Node')
    Falta "winget        (simulado)"
    Falta "WSL 2         (simulado)"
    Falta "Docker Desktop (simulado)"
    Falta "Node.js       (simulado)"
} else {
    if (Tem-Winget) { Ok "winget" }         else { Falta "winget (instalador de programas)"; $faltando += 'winget' }
    if (Tem-Wsl)    { Ok "WSL 2" }          else { Falta "WSL 2 (necessario para o Docker)"; $faltando += 'WSL' }
    if (Tem-Docker) { Ok "Docker Desktop" } else { Falta "Docker Desktop";                   $faltando += 'Docker' }
    if (Tem-Node)   { Ok "Node.js" }        else { Falta "Node.js";                          $faltando += 'Node' }
}

if ($faltando.Count -eq 0) {
    Escrever "`n  Tudo instalado. Seguindo..." Green
    exit 0
}

# winget so e necessario se for instalar Docker ou Node
$precisaWinget = ($faltando -contains 'Docker' -or $faltando -contains 'Node')
if (-not $precisaWinget) { $faltando = $faltando | Where-Object { $_ -ne 'winget' } }

Escrever "`n  Sera instalado: $($faltando -join ', ')" Yellow
Escrever "  - Os programas vem das fontes oficiais (winget / Microsoft)."
Escrever "  - Ao continuar, voce aceita as licencas desses programas."
Escrever "  - O Windows pode pedir permissao de administrador algumas vezes."
Escrever "  - Pode demorar alguns minutos (Docker e grande, ~600 MB)."

if ($Simular) {
    Escrever "`n  [SIMULACAO] Comandos que seriam executados:" Magenta
    Escrever "    Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe"
    Escrever "    wsl --install --no-distribution   (como administrador)"
    Escrever "    wsl --update                      (como administrador)"
    Escrever "    winget install --id Docker.DockerDesktop -e"
    Escrever "    winget install --id OpenJS.NodeJS.LTS -e"
    Escrever "`n  [SIMULACAO] Nada foi instalado." Magenta
    exit 0
}

if (-not $Sim) {
    $resp = Read-Host "`n  Instalar agora? (S/N)"
    if ($resp -notmatch '^[sSyY]') {
        Erro "Instalacao cancelada. O projeto precisa dessas ferramentas para rodar."
        exit 1
    }
}

$precisaReiniciar = $false

if ($faltando -contains 'winget') {
    if (-not (Instalar-Winget)) { exit 1 }
    Ok "winget instalado"
}

if ($faltando -contains 'WSL') {
    Instalar-Wsl
    if (Tem-Wsl) { Ok "WSL instalado" } else { Falta "WSL instalado, mas so funciona depois de reiniciar" }
    $precisaReiniciar = $true   # WSL recem-instalado sempre exige reinicio
}

if ($faltando -contains 'Docker') {
    Winget-Instalar 'Docker.DockerDesktop' 'Docker Desktop'
    if (Tem-Docker) {
        Ok "Docker Desktop instalado"
        Escrever "          Na primeira vez que abrir, o Docker mostra os termos de uso: clique em Accept."
        $precisaReiniciar = $true   # o Docker adiciona o usuario ao grupo docker-users (vale apos reiniciar)
    } else {
        Erro "Docker Desktop nao foi instalado."
        Escrever "          Baixe manualmente em https://www.docker.com/products/docker-desktop/"
        exit 1
    }
}

if ($faltando -contains 'Node') {
    Winget-Instalar 'OpenJS.NodeJS.LTS' 'Node.js LTS'
    if (Tem-Node) { Ok "Node.js instalado" }
    else { Falta "Node.js nao instalou (opcional: a demo vai rodar dentro do Docker)" }
}

if ($precisaReiniciar) {
    Escrever "`n  ============================================================" Yellow
    Escrever "   Instalacao concluida! E preciso REINICIAR o computador." Yellow
    Escrever "   Depois de reiniciar, abra o apresentacao.bat de novo:" Yellow
    Escrever "   ele verifica tudo e continua de onde parou." Yellow
    Escrever "  ============================================================" Yellow
    exit 3
}

Escrever "`n  Tudo pronto. Seguindo..." Green
exit 0
