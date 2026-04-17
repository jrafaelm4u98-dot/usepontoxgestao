from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import sys

# Caminho absoluto do banco — usa LOCALAPPDATA se for um executável (PyInstaller),
# ou a pasta raiz do projeto se estiver rodando via script.
if getattr(sys, 'frozen', False):
    _BASE_DIR = os.getenv('LOCALAPPDATA', os.path.expanduser("~"))
    _BASE_DIR = os.path.join(_BASE_DIR, "financeiro_m4u")
    if not os.path.exists(_BASE_DIR):
        os.makedirs(_BASE_DIR)
else:
    _BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_DB_FILE  = os.path.join(_BASE_DIR, "financeiro_m4u.db")

DATABASE_URL = f"sqlite:///{_DB_FILE}"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
