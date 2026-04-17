import webview
import threading
import uvicorn
import time
import sys
import os
import base64
import subprocess
from backend.main import app as fastapi_app

APP_VERSION = "1.0"
REPO = "jrafaelm4u98-dot/usepontoxgestao"

# ── Estabilidade do WebView2 (Corrige Erros de Acessibilidade/Recursão) ───────
os.environ['EDGE_WEBVIEW2_ACCESSIBILITY_DISABLED'] = '1'
sys.setrecursionlimit(10000) # Aumenta margem de manobra

# ── Detecção de Chamada de Script (Bot) ──────────────────────────────────────
def _verificar_execucao_script():
    """Se o EXE for chamado com argumentos (ex: bot.py), executa o script e sai."""
    # O PyInstaller pode passar argumentos de várias formas
    # Procuramos o primeiro arquivo .py nos argumentos
    for i, arg in enumerate(sys.argv):
        if arg.endswith('.py'):
            script_path = arg
            if os.path.exists(script_path):
                # Ajusta sys.argv para o script interno
                # Preserva os argumentos que vêm após o script_path
                sys.argv = [script_path] + sys.argv[i+1:]
                # Adiciona a pasta do script ao path para imports relativos funcionarem
                script_dir = os.path.dirname(os.path.abspath(script_path))
                if script_dir not in sys.path:
                    sys.path.insert(0, script_dir)
                
                # Executa o script
                with open(script_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                exec(content, {'__name__': '__main__', '__file__': script_path})
                sys.exit(0)

# Se estiver sendo chamado como sub-processo, executa e morre aqui
if getattr(sys, 'frozen', False):
    _verificar_execucao_script()

# ── Garante que o cwd é sempre a pasta do executável/script ─────────────────
if getattr(sys, 'frozen', False):
    # Rodando como PyInstaller .exe
    _APP_DIR = os.path.dirname(sys.executable)
else:
    _APP_DIR = os.path.dirname(os.path.abspath(__file__))

os.chdir(_APP_DIR)

def _instalar_chromium_silencioso():
    """Baixa o Chromium do Playwright na primeira execução, sem abrir CMD, compatível com PyInstaller."""
    if getattr(sys, 'frozen', False):
        marker_dir = os.path.join(os.getenv('LOCALAPPDATA', os.path.expanduser("~")), "financeiro_m4u")
    else:
        marker_dir = _APP_DIR
    os.makedirs(marker_dir, exist_ok=True)
    marker = os.path.join(marker_dir, '.playwright_ok')
    if os.path.exists(marker):
        return  # Já instalado
    try:
        from playwright._impl._driver import compute_driver_executable, get_driver_env
        CREATE_NO_WINDOW = 0x08000000
        subprocess.run(
            [str(compute_driver_executable()), 'install', 'chromium'],
            env=get_driver_env(),
            creationflags=CREATE_NO_WINDOW,
            check=True,
            timeout=300,
        )
        open(marker, 'w').close()  # Marca como instalado
    except Exception:
        pass  # Se falhar, o bot avisará na hora de rodar

class Api:
    def __init__(self):
        self.window = None

    def set_window(self, window):
        self.window = window

    def save_excel(self, filename, base64_data):
        # Abre o painel NATIVO do Windows para salvar arquivo
        result = self.window.create_file_dialog(
            webview.SAVE_DIALOG, 
            directory='', 
            save_filename=filename
        )
        # Se o usuário escolheu o local e clicou em Salvar
        if result and len(result) > 0:
            file_path = result[0]
            with open(file_path, "wb") as f:
                f.write(base64.b64decode(base64_data))
            return {"sucesso": True, "caminho": file_path}
        
        return {"sucesso": False, "mensagem": "Cancelado pelo usuário"}

def run_fastapi():
    import socket
    import traceback
    
    log_dir = os.path.join(os.getenv('LOCALAPPDATA', os.path.expanduser("~")), "financeiro_m4u")
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, "log_backend.txt")
    
    try:
        # Verifica se a porta 8000 já está em uso
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", 8000))
            except socket.error:
                # Porta ocupada: assume que o backend já está rodando em outra instância
                with open(log_file, "a", encoding='utf-8') as f:
                    f.write(f"[{time.ctime()}] Porta 8000 ja em uso. Backend assumido como rodando.\n")
                return

        # Tenta iniciar o Uvicorn
        with open(log_file, "a", encoding='utf-8') as f:
            f.write(f"[{time.ctime()}] Iniciando servidor na porta 8000...\n")
            
        uvicorn.run(fastapi_app, host="127.0.0.1", port=8000, log_level="error")
        
    except Exception as e:
        # Grava QUALQUER erro de inicialização em um arquivo de log na pasta do app
        with open(log_file, "a", encoding='utf-8') as f:
            f.write(f"[{time.ctime()}] ERRO CRITICO NO BACKEND:\n")
            f.write(traceback.format_exc())
            f.write("\n" + "="*50 + "\n")

# Página de loading mostrada enquanto o servidor não sobe
_LOADING_HTML = """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0f172a;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    height: 100vh; gap: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #64748b;
  }
  .logo {
    font-size: 2rem; font-weight: 800; letter-spacing: -0.05em;
  }
  .logo span { color: #a855f7; }
  .logo em  { color: #06b6d4; font-style: normal; }
  .spinner {
    width: 36px; height: 36px;
    border: 3px solid rgba(99,102,241,0.15);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  p { font-size: 0.85rem; }
</style>
</head>
<body>
  <div class="logo"><span>UsePonto</span> <em>X</em></div>
  <div class="spinner"></div>
  <p>Iniciando o sistema...</p>
</body>
</html>
"""

def _maximize(window):
    """Callback disparado quando a janela carrega para maximizá-la."""
    try:
        window.maximize()
    except:
        pass

def _check_update_and_download(window):
    import urllib.request
    import json
    import ssl
    import tempfile
    import shutil

    api_url = f"https://api.github.com/repos/{REPO}/releases/latest"
    try:
        req = urllib.request.Request(api_url, headers={'User-Agent': 'UsePontox'})
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            latest_version = data.get("tag_name", "").replace("v", "")
            
            if latest_version and latest_version != APP_VERSION:
                assets = data.get("assets", [])
                update_url = next((a.get("browser_download_url") for a in assets if a.get("name", "").endswith(".exe")), None)
                
                if update_url:
                    window.evaluate_js("document.querySelector('p').innerText = 'Baixando atualização invisível (150mb). Por favor, não feche o sistema...';")
                    
                    update_exe = os.path.join(tempfile.gettempdir(), "UsePontoX_Updater.exe")
                    ctx = ssl.create_default_context()
                    ctx.check_hostname = False
                    ctx.verify_mode = ssl.CERT_NONE
                    
                    req_dl = urllib.request.Request(update_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req_dl, context=ctx, timeout=600) as response, open(update_exe, 'wb') as out_file:
                        shutil.copyfileobj(response, out_file)
                        
                    window.evaluate_js("document.querySelector('p').innerText = 'Instalando atualização... O sistema será reiniciado.';")
                    subprocess.Popen([
                        update_exe, 
                        "/VERYSILENT", 
                        "/SUPPRESSMSGBOXES", 
                        "/FORCECLOSEAPPLICATIONS"
                    ], creationflags=0x08000000)
                    
                    time.sleep(1)
                    os._exit(0)
                    return True
    except Exception as e:
        print("Update skipped:", e)
    return False

def background_tasks(window):
    import urllib.request
    
    # 1. Verifica atualizacoes
    updated = _check_update_and_download(window)
    if updated:
        return
        
    window.evaluate_js("document.querySelector('p').innerText = 'Iniciando o sistema local...';")
    
    # 2. Instale Chromium em background na 1a vez
    t_chrome = threading.Thread(target=_instalar_chromium_silencioso, daemon=True)
    t_chrome.start()

    # 3. Inicia o backend em thread separado
    t = threading.Thread(target=run_fastapi, daemon=True)
    t.start()

    # 4. Pausa mais generosa (4s) para garantir que o FastAPI subiu completamente
    time.sleep(4.0)

    # 5. Entra no sistema de fato
    window.load_url('http://127.0.0.1:8000/')
    _maximize(window)

def start_desktop():
    api = Api()
    window = webview.create_window(
        'USEPONTOX',
        html=_LOADING_HTML,
        js_api=api,
        width=1280,
        height=800,
        min_size=(1024, 768),
        background_color='#0f172a'
    )
    api.set_window(window)

    webview.start(background_tasks, window, debug=False)

if __name__ == "__main__":
    start_desktop()

