from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio
import os
import re
import base64
import sys
import subprocess
import tempfile
import shutil
from fastapi import File, UploadFile, Form
from fastapi.staticfiles import StaticFiles

from . import models, schemas, auth, database
from .database import engine, get_db
from .processor import parse_sales, parse_desmembramentos, process_business_rules, generate_excel_bytes
from .vencidos_processor import process_boletos_vencidos

def get_signal_dir():
    _base_data = os.getenv('LOCALAPPDATA', os.path.expanduser("~"))
    path = os.path.join(_base_data, "financeiro_m4u", "_signals")
    os.makedirs(path, exist_ok=True)
    return path

from sqlalchemy import text

# Executa migrações manuais para colunas novas
def run_migrations():
    try:
        with engine.connect() as conn:
            # Adiciona a coluna avatar_url se não existir
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url TEXT"))
                conn.commit()
                print("Migração: Coluna 'avatar_url' adicionada com sucesso.")
            except Exception:
                # Se der erro aqui, é provável que a coluna já exista
                pass
    except Exception as e:
        print(f"Erro ao tentar rodar migrações: {e}")

run_migrations()

# Cria as tabelas no banco de dados (casos as novas não existam)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="USEPONTOX")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Criar usuário admin inicial se não existir
def create_initial_admin():
    db = database.SessionLocal()
    admin_email = "jrafael.m4u98@gmail.com"
    admin = db.query(models.User).filter(models.User.username == admin_email).first()
    if not admin:
        hashed_pw = auth.get_password_hash("admin123")
        new_admin = models.User(
            username=admin_email,
            hashed_password=hashed_pw,
            is_admin=True
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        
        # Dar todas as permissões iniciais ao admin mestre
        new_perms = [
            "home", "manual", "tratamento", "emissao", "vencidos", 
            "contas", "operadoras", "contratos", "notadebito", "comissionamento",
            "rh", "atendimento", "comercial", "usuarios"
        ]
        for menu in new_perms:
            perm = models.Permission(menu_item=menu, has_access=True, user_id=new_admin.id)
            db.add(perm)
        db.commit()
    db.close()

def sync_permissions():
    db = database.SessionLocal()
    try:
        # Migra boletos-vencidos para vencidos
        old_perms = db.query(models.Permission).filter(models.Permission.menu_item == "boletos-vencidos").all()
        for p in old_perms:
            p.menu_item = "vencidos"
        if old_perms:
            db.commit()
            print(f"Sincronizados {len(old_perms)} registros de permissões antigas.")
    except Exception as e:
        print(f"Erro ao sincronizar permissões: {e}")
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    try:
        create_initial_admin()
        sync_permissions()
    except Exception as e:
        print(f"CRITICAL ERROR ON STARTUP: {e}")

@app.post("/login", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        # Tenta autenticação via Supabase
        supabase_user = auth.verify_password_supabase(form_data.username, form_data.password)
        
        if supabase_user:
            # Garante que o usuário existe no banco local para manter permissões
            user = db.query(models.User).filter(models.User.username == form_data.username).first()
            if not user:
                # Se não existe localmente, cria com permissões padrão
                user = models.User(
                    username=form_data.username,
                    hashed_password="EXTERNAL_AUTH", # Não usada
                    is_admin=False
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                
                # Adiciona permissões básicas
                for menu in ["tratamento", "emissao"]:
                    perm = models.Permission(menu_item=menu, has_access=True, user_id=user.id)
                    db.add(perm)
                db.commit()

            # Sincroniza do Supabase Metadata para o SQLite local (Garante que a máquina cliente receba as alterações)
            try:
                meta = supabase_user.user_metadata or {}
                if 'usepontox_permissions' in meta:
                    db.query(models.Permission).filter(models.Permission.user_id == user.id).delete()
                    for menu, acc in meta['usepontox_permissions'].items():
                        db.add(models.Permission(user_id=user.id, menu_item=menu, has_access=acc))
                    db.commit()
                if 'usepontox_is_admin' in meta:
                    user.is_admin = meta['usepontox_is_admin']
                    db.commit()
            except Exception as e:
                print(f"Erro ao sincronizar do metadata no login: {e}")

            access_token = auth.create_access_token(data={"sub": form_data.username})
            permissions = [p.menu_item for p in user.permissions if p.has_access]
            return {
                "access_token": access_token, 
                "token_type": "bearer",
                "username": user.username,
                "is_admin": user.is_admin,
                "avatar_url": user.avatar_url,
                "permissions": permissions
            }
        
        # Fallback para banco local (opcional, para transição)
        user = db.query(models.User).filter(models.User.username == form_data.username).first()
        if user and auth.verify_password(form_data.password, user.hashed_password):
            access_token = auth.create_access_token(data={"sub": user.username})
            permissions = [p.menu_item for p in user.permissions if p.has_access]
            return {
                "access_token": access_token, 
                "token_type": "bearer",
                "username": user.username,
                "is_admin": user.is_admin,
                "avatar_url": user.avatar_url,
                "permissions": permissions
            }

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos (Supabase/Local)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        import traceback
        err_detail = f"CRASH NO LOGIN: {str(e)}\n{traceback.format_exc()}"
        print(err_detail)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_detail
        )

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

# Gerenciamento de Usuários (Apenas Admin)
@app.get("/admin/users", response_model=List[schemas.User])
async def list_users(db: Session = Depends(get_db), admin: models.User = Depends(auth.get_admin_user)):
    # SINCRONIZAÇÃO EM TEMPO REAL COM SUPABASE
    try:
        sb_res = auth.supabase.auth.admin.list_users()
        sb_users = getattr(sb_res, 'users', sb_res)
        
        # Garante que todo usuário do Supabase existe no banco local para permissões
        for sb_user in sb_users:
            email = sb_user.email
            if not email: continue
            
            db_user = db.query(models.User).filter(models.User.username == email).first()
            if not db_user:
                # Cria usuário local "fantasma" para permitir configuração de acessos
                db_user = models.User(
                    username=email,
                    hashed_password="EXTERNAL_AUTH",
                    is_admin=False
                )
                db.add(db_user)
                db.commit()
                db.refresh(db_user)
                # Adiciona algumas permissões básicas
                for menu in ["tratamento", "emissao"]:
                    p = models.Permission(menu_item=menu, has_access=True, user_id=db_user.id)
                    db.add(p)
                db.commit()
                
            # Garante que o banco local se mantenha igual ao metadata do Supabase
            try:
                meta = sb_user.user_metadata or {}
                if 'usepontox_permissions' in meta:
                    db.query(models.Permission).filter(models.Permission.user_id == db_user.id).delete()
                    for menu, acc in meta['usepontox_permissions'].items():
                        db.add(models.Permission(menu_item=menu, has_access=acc, user_id=db_user.id))
                if 'usepontox_is_admin' in meta:
                    db_user.is_admin = meta['usepontox_is_admin']
                db.commit()
            except Exception as e:
                print(f"Erro atualizando permissions locais a partir do supabase metadata: {e}")
                
    except Exception as e:
        print(f"Erro ao sincronizar com Supabase: {e}")
        # Prossegue com o que tem no banco local mesmo se falhar a sincronização
        
    return db.query(models.User).all()

@app.post("/admin/users", response_model=schemas.User)
async def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), admin: models.User = Depends(auth.get_admin_user)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Usuário já existe no banco local")
    
    # Criar no Supabase usando Admin API
    try:
        sb_res = auth.supabase.auth.admin.create_user({
            "email": user.username,
            "password": user.password,
            "email_confirm": True
        })
        if hasattr(sb_res, 'error') and sb_res.error:
            # Melhora o log de erro para o usuário
            error_msg = sb_res.error.message
            if "User not allowed" in error_msg:
                error_msg = "Permissão negada (User not allowed). Verifique se a SERVICE_KEY no .env é a 'service_role' key do Supabase."
            raise Exception(error_msg)
    except Exception as e:
        print(f"DETALHE ERRO SUPABASE: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erro ao criar no Supabase: {str(e)}")

    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        is_admin=user.is_admin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/admin/users/{user_id}/role")
async def update_user_role(user_id: int, is_admin: bool = Form(...), db: Session = Depends(get_db), admin: models.User = Depends(auth.get_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Proteção para o admin mestre
    if user.username == "jrafael.m4u98@gmail.com" and not is_admin:
        raise HTTPException(status_code=400, detail="Não é possível rebaixar o administrador mestre")
        
    user.is_admin = is_admin
    db.commit()
    
    # Sincroniza alteração para o Supabase Metadata
    try:
        sb_users_res = auth.supabase.auth.admin.list_users()
        users_list = getattr(sb_users_res, 'users', sb_users_res)
        sb_target = next((u for u in users_list if u.email == user.username), None)
        if sb_target:
            meta = sb_target.user_metadata or {}
            meta['usepontox_is_admin'] = is_admin
            auth.supabase.auth.admin.update_user_by_id(sb_target.id, {"user_metadata": meta})
    except Exception as e:
        print(f"Erro ao salvar is_admin no Supabase: {e}")

    return {"status": "success", "is_admin": is_admin}

@app.delete("/admin/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db), admin: models.User = Depends(auth.get_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Proteção absoluta para o administrador mestre
    if user.username == "jrafael.m4u98@gmail.com":
        raise HTTPException(status_code=400, detail="Não é possível excluir o administrador mestre")

    # Tenta excluir no Supabase apenas se for um e-mail válido
    try:
        sb_users_res = auth.supabase.auth.admin.list_users()
        users_list = getattr(sb_users_res, 'users', sb_users_res)
        sb_target = next((u for u in users_list if u.email == user.username), None)
        
        if sb_target:
            auth.supabase.auth.admin.delete_user(sb_target.id)
            print(f"Usuário {user.username} removido com sucesso do Supabase.")
    except Exception as e:
        print(f"Aviso de sincronização Supabase na exclusão: {e}")
        # Não bloqueamos a exclusão local se falhar no Supabase (ex: usuário só local)

    db.delete(user)
    db.commit()
    return {"message": "Usuário removido com sucesso"}

@app.post("/admin/users/{user_id}/permissions")
async def update_permissions(user_id: int, permissions: List[schemas.PermissionCreate], db: Session = Depends(get_db), admin: models.User = Depends(auth.get_admin_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Remove permissões antigas
    db.query(models.Permission).filter(models.Permission.user_id == user_id).delete()
    
    # Adiciona novas e guarda no dicionario
    perms_dict = {}
    for p in permissions:
        new_p = models.Permission(user_id=user_id, menu_item=p.menu_item, has_access=p.has_access)
        db.add(new_p)
        perms_dict[p.menu_item] = p.has_access
    
    db.commit()
    
    # Sincroniza alteração de permissões para o Supabase Metadata
    try:
        sb_users_res = auth.supabase.auth.admin.list_users()
        users_list = getattr(sb_users_res, 'users', sb_users_res)
        sb_target = next((u for u in users_list if u.email == user.username), None)
        if sb_target:
            meta = sb_target.user_metadata or {}
            meta['usepontox_permissions'] = perms_dict
            auth.supabase.auth.admin.update_user_by_id(sb_target.id, {"user_metadata": meta})
    except Exception as e:
        print(f"Erro ao salvar permissões no Supabase: {e}")

    return {"message": "Permissões atualizadas"}

# Placeholder para as funcionalidades principais
@app.post("/process-spreadsheet")
async def process_spreadsheet(
    vendas_files: List[UploadFile] = File(...),
    desmembramentos_file: UploadFile = File(...),
    period: str = Form(...),
    starting_number: int = Form(1),
    # current_user: models.User = Depends(auth.get_current_active_user)
):
    try:
        all_sales = []
        for v in vendas_files:
            m = re.search(r'(\d{2})', v.filename)
            ddd = m.group(1) if m else "00"
            df_sales = parse_sales(v.file, v.filename, ddd) 
            if not df_sales.empty:
                all_sales.extend(df_sales.to_dict('records'))
                
        all_desm = parse_desmembramentos(desmembramentos_file.file, desmembramentos_file.filename)
        
        final_data = process_business_rules(all_sales, all_desm, period)
        excel_bytes = generate_excel_bytes(final_data, period, starting_number)
        
        b64 = base64.b64encode(excel_bytes).decode('utf-8')
        return {"status": "success", "base64": b64, "filename": f"boletos_{period.replace('.','_')}.xlsx"}
        
    except Exception as e:
        import traceback
        err_str = traceback.format_exc()
        with open(os.path.join(os.path.dirname(__file__), "error.log"), "w") as f:
            f.write(err_str)
        raise HTTPException(status_code=500, detail=str(e))

# ── Perfil do usuário autenticado ────────────────────────────────────────────
class ProfileUpdate(schemas.BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

@app.put("/me/profile")
def update_my_profile(
    data: ProfileUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    if data.username and data.username.strip():
        existing = db.query(models.User).filter(
            models.User.username == data.username,
            models.User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Nome de usuário já em uso.")
        current_user.username = data.username.strip()
    if data.password and data.password.strip():
        current_user.hashed_password = auth.get_password_hash(data.password.strip())
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id, 
        "username": current_user.username, 
        "is_admin": current_user.is_admin,
        "avatar_url": current_user.avatar_url
    }

@app.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    from .supabase_client import supabase
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase não configurado")
        
    # Validação de tipo
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="O arquivo deve ser uma imagem")
        
    try:
        file_ext = file.filename.split(".")[-1]
        file_name = f"avatar_{current_user.id}.{file_ext}"
        content = await file.read()
        
        # Upload para o balde 'avatars'
        # Garante que o bucket existe (Supabase Python SDK doesn't have an easy 'ensure_exists')
        # Normalmente configuramos isso manualmente ou assumimos que existe.
        
        res = supabase.storage.from_("avatars").upload(
            file_name, 
            content, 
            {"upsert": "true", "content-type": file.content_type}
        )
        
        # Pega a URL pública
        public_url = supabase.storage.from_("avatars").get_public_url(file_name)
        
        # Atualiza banco local
        current_user.avatar_url = public_url
        db.commit()
        
        return {"avatar_url": public_url}
        
    except Exception as e:
        print(f"Erro no upload de avatar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Boletos Vencidos Estrutural ───────────────────────────────────────────────────
@app.post("/process-vencidos")
async def process_vencidos(
    estrutural:  UploadFile          = File(...),
    base_pdv:    Optional[UploadFile] = File(None),
    paranaue_42: Optional[UploadFile] = File(None),
    paranaue_47: Optional[UploadFile] = File(None),
    paranaue_61: Optional[UploadFile] = File(None),
    paranaue_63: Optional[UploadFile] = File(None),
):
    """
    Gera relatório de boletos vencidos estrutural.
    Cruza ESTRUTURAL LISTAGEM + BASE PDV M4U + Paranaue (por DDD)
    e retorna Excel base64 com abas por DDD.
    """
    import asyncio

    estrutural_bytes = await estrutural.read()
    base_pdv_bytes   = await base_pdv.read() if base_pdv and base_pdv.filename else None

    paranaue_map = {}
    for ddd, f in [('42', paranaue_42), ('47', paranaue_47), ('61', paranaue_61), ('63', paranaue_63)]:
        if f and f.filename:
            paranaue_map[ddd] = await f.read()

    if not paranaue_map:
        raise HTTPException(status_code=400, detail="Envie ao menos uma planilha do Paranaue (DDD 42, 47, 61 ou 63).")

    try:
        excel_bytes = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: process_boletos_vencidos(estrutural_bytes, base_pdv_bytes, paranaue_map)
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Erro interno: {e}\n{traceback.format_exc()}")

    import base64 as _b64
    b64 = _b64.b64encode(excel_bytes).decode()
    return {"status": "ok", "base64": b64, "filename": "boletos_vencidos_estrutural.xlsx"}

@app.post("/run-bot")
async def run_bot(
    planilha: Optional[UploadFile] = File(None),
    filtro: Optional[str]  = Form(None),   # nosso_numeros separados por ';'
    ddds: Optional[str]    = Form(None),   # ddds separados por ','
):
    """
    Lança o bot Marretada sem janela CMD.
    - planilha: arquivo xlsx/xlsb enviado pela interface (ou Google Drive como fallback)
    - filtro:   string de nosso_numeros separados por ';' para restringir quais boletos gerar
    - ddds:     string de ddds permitidos (ex: '42,47')
    """
    bot_script = os.path.join(os.path.dirname(__file__), "bot.py")
    python_exe = sys.executable

    # Limpa sinais anteriores (usa LOCALAPPDATA para ter permissão de escrita)
    signal_dir = get_signal_dir()
    for fname in ["login_ok.flag", "stop.flag"]:
        try: os.remove(os.path.join(signal_dir, fname))
        except: pass

    # Salva planilha enviada (se houver)
    tmp_dir = None
    tmp_path = None
    if planilha and planilha.filename:
        tmp_dir = tempfile.mkdtemp(prefix="usepontox_bot_")
        tmp_path = os.path.join(tmp_dir, planilha.filename)
        with open(tmp_path, "wb") as fout:
            shutil.copyfileobj(planilha.file, fout)

    # Monta comando: python -u bot.py [planilha_path] [filtro_str] [ddds_str]
    cmd = [python_exe, "-u", bot_script]
    cmd.append(tmp_path or "")          # argv[1]: caminho da planilha (vazio = usar Drive)
    cmd.append(filtro or "")            # argv[2]: filtro de nosso_numeros (vazio = todos)
    cmd.append(ddds or "")              # argv[3]: filtro de DDDs (vazio = todos)

    async def event_generator():
        proc = None
        try:
            import json as _json
            CREATE_NO_WINDOW = 0x08000000  # sem janela CMD no Windows
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=os.path.dirname(__file__),
                creationflags=CREATE_NO_WINDOW
            )
            # Lê linha a linha de forma não-bloqueante (não trava o event loop)
            async for raw in proc.stdout:
                line = raw.decode('utf-8', errors='replace').strip()
                if not line: continue
                try:
                    _json.loads(line)  # valida JSON
                    yield f"data: {line}\n\n"
                except Exception:
                    payload = _json.dumps({"msg": line, "type": "error"})
                    yield f"data: {payload}\n\n"
            await proc.wait()
        finally:
            if proc and proc.returncode is None:
                try: proc.kill()
                except: pass
            if tmp_dir:
                shutil.rmtree(tmp_dir, ignore_errors=True)
            yield 'data: {"msg": "__DONE__", "type": "done"}\n\n'

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

@app.post("/bot-login-ok")
async def bot_login_ok():
    """Cria o arquivo de sinal para o bot saber que o login foi confirmado."""
    signal_dir = get_signal_dir()
    open(os.path.join(signal_dir, "login_ok.flag"), 'w').close()
    return {"ok": True}

@app.post("/bot-stop")
async def bot_stop():
    """Alterna o arquivo de sinal para Pausar/Retomar o bot."""
    signal_dir = get_signal_dir()
    flag_path = os.path.join(signal_dir, "stop.flag")
    if os.path.exists(flag_path):
        os.remove(flag_path)
        return {"ok": True, "status": "resumed"}
    else:
        open(flag_path, 'w').close()
        return {"ok": True, "status": "paused"}

# Servir Frontend
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")

