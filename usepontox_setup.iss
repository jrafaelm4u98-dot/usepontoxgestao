; ============================================================
;  UsePontoX - Script Inno Setup
;  Gera: UsePontoX_Setup.exe
;  Fonte: pasta dist\UsePontoX\ (gerada pelo PyInstaller)
; ============================================================

#define MyAppName      "UsePontoX"
#define MyAppVersion   "1.0.0"
#define MyAppPublisher "M4U Financeiro"
#define MyAppExeName   "UsePontoX.exe"
#define MyAppDir       "dist\UsePontoX"

[Setup]
AppId={{E7A2C3F1-4B8D-4E9A-A1B2-D3C4E5F67890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL=https://m4u.com.br
AppSupportURL=https://m4u.com.br
AppUpdatesURL=https://m4u.com.br
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; Arquivo de saída
OutputDir=installer_output
OutputBaseFilename=UsePontoX_v35_Setup
; Compressão máxima
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
SetupIconFile=app_icon.ico
; Requer admin para instalar em Program Files
PrivilegesRequired=admin
; Ícone do instalador (opcional - adicione assets\icon.ico se tiver)
; SetupIconFile=assets\icon.ico
WizardStyle=modern
WizardSizePercent=120
; Imagem lateral do wizard (opcional)
; WizardImageFile=assets\wizard_banner.bmp

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon";   Description: "Criar atalho na Área de Trabalho"; GroupDescription: "Atalhos:"
Name: "startmenuicon"; Description: "Criar atalho no Menu Iniciar";     GroupDescription: "Atalhos:"

[Files]
; Todos os arquivos do PyInstaller
Source: "{#MyAppDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Atalho no Menu Iniciar
Name: "{group}\{#MyAppName}";              Filename: "{app}\{#MyAppExeName}"; Tasks: startmenuicon
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}";         Tasks: startmenuicon
; Atalho na Área de Trabalho
Name: "{autodesktop}\{#MyAppName}";       Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Abre o app ao final da instalação
Filename: "{app}\{#MyAppExeName}"; \
  Description: "Iniciar {#MyAppName} agora"; \
  Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Limpa arquivos gerados pelo app durante o uso
Type: filesandordirs; Name: "{app}\_signals"
Type: filesandordirs; Name: "{app}\downloads_temp"
Type: files;          Name: "{app}\.playwright_ok"

[Code]
// Verifica se o WebView2 está instalado (necessário para pywebview)
function IsWebView2Installed(): Boolean;
var
  Version: String;
begin
  Result := RegQueryStringValue(
    HKLM,
    'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
    'pv', Version
  ) and (Version <> '');
  if not Result then
    Result := RegQueryStringValue(
      HKCU,
      'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
      'pv', Version
    ) and (Version <> '');
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if not IsWebView2Installed() then
    begin
      MsgBox(
        'Atenção: O componente Microsoft WebView2 não foi detectado.' + #13#10 +
        'O sistema pode não abrir corretamente.' + #13#10 + #13#10 +
        'Se o app não abrir, instale o WebView2 em:' + #13#10 +
        'https://developer.microsoft.com/pt-br/microsoft-edge/webview2/',
        mbInformation, MB_OK
      );
    end;
  end;
end;
