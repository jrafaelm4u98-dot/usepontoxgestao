import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Tenta carregar do .env, mas garante valores padrão para o EXE
load_dotenv()

# CREDENCIAIS EMBUTIDAS PARA PRODUÇÃO (CONECTIVIDADE GARANTIDA)
URL_PROD = "https://wvlciupetaetdrwdbhar.supabase.co"
KEY_PROD = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2bGNpdXBldGFldGRyd2RiaGFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2ODcyMywiZXhwIjoyMDkxOTQ0NzIzfQ.57O0MlWYSda0LJqSYp--Hfnv0w-2oogCKnYfcGpVeRc"

url: str = os.getenv("SUPABASE_URL") or URL_PROD
key: str = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY") or KEY_PROD

if not url or not key:
    print("WARNING: Supabase credentials not found, using production defaults.")
    url = URL_PROD
    key = KEY_PROD

supabase: Client = create_client(url, key)
