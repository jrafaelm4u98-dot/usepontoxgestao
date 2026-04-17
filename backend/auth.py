from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from . import models
from .supabase_client import supabase

# Configurações de Segurança
SECRET_KEY = "SUA_CHAVE_SECRETA_MUITO_SEGURA_AQUI" # Em produção, use variável de ambiente
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 horas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain_password: str, hashed_password: str):
    try:
        if hashed_password == "EXTERNAL_AUTH":
            return False
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except:
        return False

def verify_password_supabase(email: str, password: str):
    try:
        if not supabase:
            return None
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        return res.user
    except Exception as e:
        error_msg = str(e).lower()
        print(f"Supabase login error: {e}")
        if "rate_limit" in error_msg or "too many requests" in error_msg:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Muitas tentativas de login. Por favor, aguarde alguns minutos e tente novamente."
            )
        elif "invalid login credentials" in error_msg or "invalid credentials" in error_msg:
            return None  # Permite o fallback para banco local se a senha estiver errada
        elif "network" in error_msg or "fetch" in error_msg or "connection" in error_msg:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Sem conexão com a internet ou servidor indisponível. Verifique sua rede."
            )
        return None

def get_password_hash(password: str):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_admin_user(current_user: models.User = Depends(get_current_active_user)):
    # Admin root sempre tem acesso
    if current_user.is_admin:
        return current_user
    
    # Verifica se tem a permissão específica de usuários
    has_perm = any(p.menu_item == 'usuarios' and p.has_access for p in current_user.permissions)
    if not has_perm:
        raise HTTPException(status_code=403, detail="Não possui privilégios para gerenciar usuários")
    return current_user
