import os
import urllib.request
import json
import zipfile
import shutil
import time

REPO = "jrafaelm4u98-dot/usepontoxgestao"
API_URL = f"https://api.github.com/repos/{REPO}/commits/main"
ZIP_URL = f"https://github.com/{REPO}/archive/refs/heads/main.zip"
VERSION_FILE = "version.txt"

# Ignorar o banco de dados e variaveis de ambiente
IGNORED_FILES = {
    "financeiro_m4u.db",
    "financeiro_m4u.db-journal",
    ".env",
    "frontend/.env",
    "version.txt"
}

IGNORED_FOLDERS = {
    "installer_output",
    "financeiro_m4u",
    ".git"
}

def get_latest_commit_sha():
    try:
        req = urllib.request.Request(API_URL, headers={'User-Agent': 'UsePontox-Updater'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return data.get("sha")
    except Exception as e:
        print(f"Pulo: Sem conexao com atualizacoes. Iniciando.")
        return None

def get_local_commit_sha():
    if os.path.exists(VERSION_FILE):
        with open(VERSION_FILE, "r") as f:
            return f.read().strip()
    return None

def update_system(latest_sha):
    print("\n---------------------------------------------------")
    print("   NOVA VERSAO DETECTADA! BAIXANDO ATUALIZACOES...")
    print("---------------------------------------------------")
    zip_path = "update_main.zip"
    extract_path = "update_extracted"
    
    try:
        # 1. Baixar o ZIP
        req = urllib.request.Request(ZIP_URL, headers={'User-Agent': 'UsePontox-Updater'})
        with urllib.request.urlopen(req, timeout=30) as response, open(zip_path, 'wb') as out_file:
            shutil.copyfileobj(response, out_file)
            
        print("Configurando novos arquivos...")
        # 2. Extrair
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_path)
            
        # 3. Mover arquivos da pasta repo-main para raiz
        extracted_folder = os.path.join(extract_path, os.listdir(extract_path)[0])
        
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        
        for root, dirs, files in os.walk(extracted_folder):
            rel_path = os.path.relpath(root, extracted_folder)
            dest_dir = os.path.join(BASE_DIR, rel_path) if rel_path != "." else BASE_DIR
            
            # Pula pastas ignoradas
            if any(ignored in root for ignored in IGNORED_FOLDERS):
                continue
                
            os.makedirs(dest_dir, exist_ok=True)
            
            for file in files:
                if file in IGNORED_FILES:
                    continue
                    
                src_file = os.path.join(root, file)
                dest_file = os.path.join(dest_dir, file)
                
                shutil.copy2(src_file, dest_file)
                
        # 4. Salvar nova versao
        with open(VERSION_FILE, "w") as f:
            f.write(latest_sha)
            
        print("Sucesso! Tudo atualizado.")
        time.sleep(2)
        
    except Exception as e:
        print(f"Falha ao extrair atualizacao: {e}")
    finally:
        # Limpeza
        if os.path.exists(zip_path):
            os.remove(zip_path)
        if os.path.exists(extract_path):
            shutil.rmtree(extract_path, ignore_errors=True)

if __name__ == "__main__":
    print("Verificando se existe versao nova...")
    latest = get_latest_commit_sha()
    local = get_local_commit_sha()
    
    if latest and latest != local:
        update_system(latest)
    else:
        print("Sistema OK.")
