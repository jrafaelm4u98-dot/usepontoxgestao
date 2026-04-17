import webview
import threading
import uvicorn
import time
import sys
import os
import base64
import subprocess
from backend.main import app as fastapi_app

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

def start_desktop():
    import urllib.request
    
    # Instale Chromium em background na 1ª vez (sem janela CMD)
    t_chrome = threading.Thread(target=_instalar_chromium_silencioso, daemon=True)
    t_chrome.start()

    # Inicia o backend em thread separado
    t = threading.Thread(target=run_fastapi, daemon=True)
    t.start()

    # Pausa mais generosa (4s) para garantir que o FastAPI subiu completamente
    time.sleep(4.0)

    api = Api()
    window = webview.create_window(
        'USEPONTOX',
        url='http://127.0.0.1:8000/',
        js_api=api,
        width=1280,
        height=800,
        min_size=(1024, 768),
        background_color='#0f172a'
    )
    api.set_window(window)

    # Inicia o loop do webview (bloqueia aqui até fechar a janela)
    # Passamos window dentro de uma tupla para o callback
    webview.start(_maximize, (window,), debug=False)

if __name__ == "__main__":
    start_desktop()
