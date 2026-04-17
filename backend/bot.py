"""
bot_wrapper.py — Consolidação absoluta da lógica USEPONTOX.
v34: Lógica Original + Persistência de Navegação (Retry Loops) + Logs Informativos.
"""
import asyncio
import os
import re
import sys
import shutil
import time
import json
from pathlib import Path
from datetime import date, datetime

def emit(msg: str, tipo: str = "info"):
    print(json.dumps({"msg": msg, "type": tipo}), flush=True)

def check_libs():
    try:
        import pandas
        import playwright
        return True
    except ImportError as e:
        emit(f"❌ Biblioteca faltando: {e}", "error")
        return False

if not check_libs(): sys.exit(1)

import pandas as pd
from playwright.async_api import async_playwright, Page, BrowserContext

# Semáforo de pausa via arquivo signal
PAUSE_EVENT = asyncio.Event()
PAUSE_EVENT.set()

CNPJ_FIXO_VENDEDOR = "04193879000196"

def get_data_dir():
    base = os.getenv('LOCALAPPDATA', os.path.expanduser("~"))
    data_dir = os.path.join(base, "financeiro_m4u")
    os.makedirs(data_dir, exist_ok=True)
    return Path(data_dir)

DATA_DIR = get_data_dir()
SIGNAL_DIR = DATA_DIR / "_signals"
SIGNAL_DIR.mkdir(exist_ok=True)
SIGNAL_LOGIN_OK = SIGNAL_DIR / "login_ok.flag"
SIGNAL_STOP     = SIGNAL_DIR / "stop.flag"

def limpar_signals():
    for f in [SIGNAL_LOGIN_OK, SIGNAL_STOP]:
        try: f.unlink()
        except: pass

def encontrar_pasta_planilha():
    sub_path = os.path.join("Drives compartilhados", "ADM FINANCEIRO - REGIONAL SUL", "CONTROLE - BOLETO ESTRUTURAL")
    for letra in "FGHIJKLMNOPQRSTUVWXYZ":
        drive = f"{letra}:\\"
        candidato = os.path.join(drive, sub_path)
        if os.path.isdir(candidato): return candidato
    return None

def get_base_dir():
    if getattr(sys, 'frozen', False): return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

BASE_DIR        = Path(get_base_dir())
PLANILHA_PASTA  = encontrar_pasta_planilha()
PLANILHA_NOME   = "BOLETOS ESTRUTURAL"
HISTORICO_ARQ   = DATA_DIR / "historico_boletos.txt"

DESKTOP = Path(os.path.expanduser("~")) / "Desktop"
PASTAS_DDD = { "42": DESKTOP / "42", "47": DESKTOP / "47", "61": DESKTOP / "61", "63": DESKTOP / "63" }
for _p in PASTAS_DDD.values(): _p.mkdir(parents=True, exist_ok=True)

def carregar_historico():
    if not HISTORICO_ARQ.exists(): return set()
    return set(l.strip() for l in HISTORICO_ARQ.read_text().splitlines() if l.strip())

def salvar_historico(nn):
    with open(HISTORICO_ARQ, "a") as f: f.write(f"{nn}\n")

def gerar_nome_pdf(pasta: Path, nome: str) -> Path:
    nome_limpo = re.sub(r'[<>:"/\\|?*]', '', nome).strip()
    cand = pasta / f"{nome_limpo}.pdf"
    if not cand.exists(): return cand
    n = 1
    while True:
        cand = pasta / f"{nome_limpo} {n}.pdf"
        if not cand.exists(): return cand
        n += 1

def carregar_planilha(caminho: str) -> dict:
    xl = pd.ExcelFile(caminho)
    guias = xl.sheet_names[-4:]
    resultado = {}
    for guia in guias:
        m = re.search(r'\((\d+)\)', guia)
        ddd = m.group(1) if m else guia
        df = pd.read_excel(caminho, sheet_name=guia, header=None, dtype=str)
        boletos = []
        for idx, row in df.iterrows():
            if idx < 3: continue
            nn = row.iloc[1] if len(row) > 1 else None
            nome = row.iloc[2] if len(row) > 2 else None
            valor = row.iloc[3] if len(row) > 3 else None
            venc = row.iloc[4] if len(row) > 4 else None
            cnpj_col = row.iloc[6] if len(row) > 6 else None
            if pd.isna(nn) or pd.isna(nome) or pd.isna(valor): continue
            nn_str = str(nn).strip().split('.')[0].replace(',','')
            is_desm = not pd.isna(venc) and str(venc).strip() not in ('', 'nan')
            if is_desm:
                if isinstance(venc, (date, datetime)): dv = venc.strftime('%d/%m/%Y')
                else:
                    v = str(venc).strip()
                    try: dv = datetime.strptime(v[:10], '%Y-%m-%d').strftime('%d/%m/%Y')
                    except: dv = v
            else: dv = date.today().strftime('%d/%m/%Y')
            if is_desm and not pd.isna(cnpj_col) and str(cnpj_col).strip() not in ('', 'nan'):
                cl = re.sub(r'\D', '', str(cnpj_col))
                cl = cl.zfill(11 if len(cl) <= 11 else 14)
            else: cl = CNPJ_FIXO_VENDEDOR
            val_str = f"{float(str(valor).replace(',','.')):.2f}".replace('.', ',')
            boletos.append({'nosso_numero': nn_str, 'nome': str(nome).strip(), 'valor': val_str, 'vencimento': dv, 'cnpj': cl, 'tipo': 'desmembramento' if is_desm else 'vendedor'})
        resultado[ddd] = boletos
    return resultado

# ===========================================================================
#  CLASSE BOT (RESTAURAÇÃO ROBUSTA USEPONTOX)
# ===========================================================================
class GeradorBoletos:
    def __init__(self, page: Page):
        self.page = page
        self._keepalive_task = None
        self.em_pausa = False

    async def iniciar_keepalive(self):
        self._keepalive_task = asyncio.create_task(self._keepalive_loop())
    async def parar_keepalive(self):
        if self._keepalive_task: self._keepalive_task.cancel()

    async def _keepalive_loop(self):
        while True:
            await asyncio.sleep(20)
            await self._fechar_modal_sessao()

    async def _fechar_modal_sessao(self):
        try:
            termos = [r'manter ativa', r'sim', r'continuar', r'manter logado', r'permanecer']
            frames = [self.page] + self.page.frames
            for target in frames:
                for t in termos:
                    btn = target.get_by_role("button", name=re.compile(t, re.IGNORECASE))
                    if await btn.is_visible(timeout=300):
                        await btn.click(force=True)
                        emit(f"⚡ [Sessão] Mantendo conexão ativa via '{t}'", "info")
                        return
            modal = self.page.locator('*:has-text("Sua sessão irá expirar")').first
            if await modal.is_visible(timeout=200): await self.page.keyboard.press("Escape")
        except: pass

    async def _check_pause(self):
        if SIGNAL_STOP.exists():
            if not self.em_pausa:
                emit("⏸️ Robô em PAUSA... (Remova 'Parar' para continuar)", "warn")
                self.em_pausa = True
            while SIGNAL_STOP.exists(): await asyncio.sleep(1)
            if self.em_pausa:
                emit("▶️ Robô RETOMADO! Continuando...", "ok")
                self.em_pausa = False
        if not PAUSE_EVENT.is_set(): await PAUSE_EVENT.wait()

    async def _aguardar_estavel(self, ms: int = 1500):
        await self._check_pause()
        await self.page.wait_for_timeout(ms + 500)

    async def _type_humanly(self, locator, text: str, delay: int = 50):
        await self._check_pause()
        await locator.scroll_into_view_if_needed()
        await locator.click()
        await self.page.keyboard.press('Control+A')
        await self.page.keyboard.press('Backspace')
        for char in text:
            await self._check_pause()
            await self.page.keyboard.type(char, delay=delay)

    async def _prosseguir(self):
        """Versão ROBUSTA: Tenta encontrar o botão por 10 segundos antes de desistir."""
        emit("  ⏳ Procurando botão PROSSEGUIR...", "info")
        timeout = 10 
        inicio_proc = time.time()
        
        while time.time() - inicio_proc < timeout:
            await self._check_pause()
            frames = [self.page] + self.page.frames
            for f in reversed(frames):
                try:
                    seletores = ['#BotaoProsseguirContabeis','#BotaoProsseguirTitulo','#BotaoProsseguirConvenios','div[type="submit"]','button','div.btn']
                    for s in seletores:
                        loc = f.locator(s)
                        cnt = await loc.count()
                        if cnt > 0:
                            for i in range(cnt - 1, -1, -1):
                                btn = loc.nth(i)
                                if await btn.is_visible(timeout=50):
                                    try:
                                        txt = (await btn.inner_text()).upper()
                                        if "PROSSEGUIR" in txt and "ALTERAR" not in txt:
                                            emit(f"      👉 Acionando: {txt.strip()} ({s})", "info")
                                            await btn.click(force=True, timeout=3000)
                                            await self._aguardar_estavel(2000)
                                            return
                                    except: pass
                    
                    # Fallback por texto
                    fb = f.locator('*:has-text("PROSSEGUIR")')
                    for i in range(await fb.count()-1, -1, -1):
                        btn = fb.nth(i)
                        try:
                            if await btn.is_visible(timeout=50):
                                txt = (await btn.inner_text()).upper()
                                if "PROSSEGUIR" in txt and "ALTERAR" not in txt:
                                    emit(f"      👉 Acionando Prosseguir via Texto...", "info")
                                    await btn.click(force=True, timeout=2000)
                                    await self._aguardar_estavel(2000)
                                    return
                        except: pass
                except: pass
            
            # Se não achou em nenhum frame, espera um pouco e tenta de novo
            await asyncio.sleep(0.5)
            
        emit("  ⚠️ Aviso: Botão PROSSEGUIR não detectado após 10s.", "warn")

    async def _fill_by_label(self, label_regex: str, text: str):
        regex = re.compile(label_regex, re.IGNORECASE)
        # Sincronismo robusto para preenchimento (Tenta por 12x como no original)
        emit(f"  ⏳ Preenchendo: {label_regex}...", "info")
        for tentativa in range(12):
            await self._check_pause()
            frames = [self.page] + self.page.frames
            mapa = {
                r'Seu N[ºo°]? do Documento': 'input[aria-label*="Seu n" i], input[id*="seuNumero" i]',
                r'Vencimento': 'input[aria-label*="vencimento" i], input[id*="vencimento" i]',
                r'Valor': 'input[aria-label="Valor" i], input[id="vm.TIT.valor"]',
                r'Nosso N[ºu]mero': 'input[aria-label*="Nosso n" i], input[id*="nossoNrParte" i]'
            }
            sel_exato = mapa.get(label_regex)
            
            for t in frames:
                try:
                    if sel_exato:
                        c = t.locator(sel_exato).first
                        if await c.is_visible(timeout=50) and await c.is_editable():
                            await self._type_humanly(c, text); return
                    
                    labels = t.get_by_label(regex)
                    if await labels.count() > 0:
                        c = labels.first
                        if await c.is_visible(timeout=50) and await c.is_editable():
                            await self._type_humanly(c, text); return
                    
                    texts = t.get_by_text(regex)
                    if await texts.count() > 0:
                        tr = texts.last
                        if await tr.is_visible(timeout=50):
                            for xp in ["xpath=..//input", "xpath=../..//input"]:
                                c = tr.locator(xp).first
                                if await c.is_visible(timeout=50) and await c.is_editable():
                                    await self._type_humanly(c, text); return
                except: continue
            await self.page.wait_for_timeout(600)
        raise RuntimeError(f"Campo {label_regex} não apareceu na tela.")

    async def clicar_novo_registro(self) -> bool:
        await self._check_pause()
        emit("  ⏳ Acionando atalho para NOVO REGISTRO...", "info")
        frames = [self.page] + self.page.frames
        for t in frames:
            try:
                b = t.locator('button[aria-label="Botao novo registro"], button:has-text("NOVO REGISTRO")').first
                if await b.is_visible(timeout=500):
                    await b.click(force=True); await self._aguardar_estavel(2000)
                    emit("      ✅ NOVO REGISTRO solicitado com sucesso!", "ok"); return True
            except: pass
        return False

    async def abrir_gerar_boleto(self):
        emit("  ⏳ Pesquisando função 'Gerar Boleto' no banco...", "info")
        await self._fechar_modal_sessao()
        for _ in range(5):
            try:
                s = self.page.get_by_placeholder("O que você precisa?")
                await s.wait_for(state="visible", timeout=3000)
                await s.click(timeout=2000); await s.fill('gerar', timeout=2000)
                await self.page.wait_for_timeout(1000); break
            except: await self.page.wait_for_timeout(1500)
        o = self.page.get_by_text("Gerar boleto", exact=True)
        await o.first.click(timeout=5000); await self._aguardar_estavel(2000); await self._fechar_modal_sessao()

    async def tela_inicial_prosseguir(self):
        emit("  ⏳ Iniciando navegação (Prosseguir Inicial)...", "info")
        await self._fechar_modal_sessao(); await self._prosseguir()

    async def preencher_parte1(self, nn, valor, venc):
        emit(f"  📝 Preenchendo Dados Básicos (NN {nn})...", "info")
        await self._fechar_modal_sessao()
        await self._fill_by_label(r'Seu N[ºo°]? do Documento', nn)
        await self._fill_by_label(r'Vencimento', venc)
        await self._fill_by_label(r'Valor', valor)
        await self._fill_by_label(r'Nosso N[ºu]mero', nn)
        await self.page.wait_for_timeout(300); await self._fechar_modal_sessao(); await self._prosseguir()

    async def preencher_parte2(self, nome):
        emit(f"  📝 Preenchendo Passo 2 (Mensagem -> {nome})...", "info")
        await self._fechar_modal_sessao()
        
        # Persistência: Espera até 10s pelo campo aparecer
        done = False
        timeout = 10
        inicio_p2 = time.time()
        
        while time.time() - inicio_p2 < timeout:
            await self._check_pause()
            frames = [self.page] + self.page.frames
            for t in frames:
                if done: break
                try:
                    # PRIORIDADE TOTAL: Seletores exatos fornecidos pelo usuário
                    seletores_p2 = [
                        'input#vm\\.CMPT\\.mensagem1', 
                        'input[id="vm.CMPT.mensagem1"]',
                        'input[aria-label="Mensagem 1"]',
                        'xpath=//*[normalize-space(text())="1)"]/following::input[1]'
                    ]
                    for s in seletores_p2:
                        c = t.locator(s).first
                        if await c.is_visible(timeout=100) and await c.is_editable():
                            await self._type_humanly(c, nome); done = True; break
                except: pass
                
                if not done:
                    try:
                        # Fallback: Bloco de Mensagens
                        cont = t.locator('div, fieldset, table, tbody').filter(has_text=re.compile(r'Mensagens', re.IGNORECASE)).last
                        if await cont.is_visible(timeout=50):
                            c = cont.locator('input[type="text"]').first
                            if await c.is_visible(timeout=50) and await c.is_editable():
                                await self._type_humanly(c, nome); done = True; break
                    except: pass
            
            if done: break
            await asyncio.sleep(0.5)

        if done: 
            emit("      ✅ Campo 'Mensagem 1' preenchido.", "ok")
        else: 
            emit("      ⚠️ Campo 'Mensagem 1' (1)) não encontrado após 10s.", "warn")
            
        await self.page.wait_for_timeout(2000) # Buffer extra de 2s solicitado pelo usuário
        await self._fechar_modal_sessao()
        await self._prosseguir()

    async def preencher_parte3(self, cnpj, nome) -> bool:
        emit(f"  📝 Passo 3: Pesquisando Pagador (CNPJ/CPF {cnpj})...", "info")
        await self._fechar_modal_sessao()
        frames = [self.page] + self.page.frames
        n_limpo = re.sub(r'\D', '', cnpj)
        label = "CNPJ" if len(n_limpo) > 11 else "CPF"
        fmt = f"{n_limpo[:2]}.{n_limpo[2:5]}.{n_limpo[5:8]}/{n_limpo[8:12]}-{n_limpo[12:]}" if len(n_limpo) == 14 else (f"{n_limpo[:3]}.{n_limpo[3:6]}.{n_limpo[6:9]}-{n_limpo[9:]}" if len(n_limpo) == 11 else n_limpo)
        radio = False
        for t in frames:
            if radio: break
            try:
                lbls = t.locator('label, span').filter(has_text=re.compile(fr'^{label}$'))
                for i in range(await lbls.count()):
                    lbl = lbls.nth(i)
                    if await lbl.is_visible(timeout=50):
                        is_bf = await lbl.evaluate('el => !!el.closest("fieldset, div, section")?.innerText.toUpperCase().includes("BENEFICIÁRIO FINAL")')
                        if not is_bf: await lbl.click(force=True); radio = True; emit(f"      ✅ Rádio {label} selecionado", "ok"); break
            except: pass
        await self.page.wait_for_timeout(800)
        done = False
        for t in frames:
            if done: break
            try:
                cs = t.locator('input')
                for i in range(await cs.count()):
                    inp = cs.nth(i)
                    if await inp.is_visible(timeout=50) and await inp.is_editable():
                        is_bf = await inp.evaluate('el => !!el.closest("fieldset, div, section")?.innerText.toUpperCase().includes("BENEFICIÁRIO FINAL")')
                        if is_bf: continue
                        ph = (await inp.get_attribute("placeholder") or "").lower()
                        ar = (await inp.get_attribute("aria-label") or "").lower()
                        if any(x in ph or x in ar for x in ["cpf", "cnpj", "pesquisar", "nome"]):
                            await self._type_humanly(inp, n_limpo); await self.page.wait_for_timeout(500)
                            box = await inp.bounding_box()
                            if box: await self.page.mouse.click(box['x'] + box['width'] + 15, box['y'] + box['height']/2)
                            done = True; emit(f"      ✅ Pesquisa acionada.", "ok"); break
            except: pass
        await self.page.wait_for_timeout(3000)
        sel = False
        for t in frames:
            if sel: break
            try:
                tabs = t.locator('table, mat-table, .table')
                for i in range(await tabs.count()):
                    tab = tabs.nth(i)
                    if await tab.is_visible(timeout=50):
                        txt = await tab.inner_text()
                        if "RAZÃO SOCIAL" in txt or "CPF" in txt or n_limpo in txt or fmt in txt:
                            ls = tab.locator('tbody tr, .mat-row')
                            for k in range(await ls.count()):
                                rw = ls.nth(k); txt_l = await rw.inner_text()
                                if n_limpo in txt_l or fmt in txt_l:
                                    await rw.locator('td, .mat-cell').first.click(force=True); sel = True; break
            except: pass
        if not sel:
            emit(f"  ⚠️ Pagador não selecionado automaticamente!", "warn"); emit("__AGUARDANDO_PAGADOR__", "warn")
            start = time.time()
            while time.time() - start < 60:
                await self._check_pause()
                for f in frames:
                    try:
                        if await f.locator('div:has-text("Registrar"), button:has-text("Registrar"), [aria-label*="registrar" i]').first.is_visible(timeout=50): return True
                    except: pass
                await asyncio.sleep(0.1)
            return False
        return True

    async def registrar_boleto(self):
        emit("  ⏳ Finalizando: Clicando em REGISTRAR...", "info")
        await self._fechar_modal_sessao()
        frames = [self.page] + self.page.frames; done = False
        async def handle_dialog(d): nonlocal done; emit(f"      🔔 Confirmação: '{d.message}' -> ACEITO!", "ok"); await d.accept(); done = True
        self.page.on("dialog", handle_dialog)
        try:
            for _ in range(4):
                if done: break
                for t in frames:
                    if done: break
                    try:
                        btns = t.locator('div[ng-click*="clicarBotaoEncaminhamentoProsseguirOuRegistrarAvulso"], [aria-label="Botao de encaminhamento prosseguir ou registrar avulso"], div:has-text("Registrar")')
                        for i in range(await btns.count() - 1, -1, -1):
                            b = btns.nth(i)
                            if await b.is_visible(timeout=100):
                                emit("      👉 Acionando REGISTRAR (Sequência Automatizada)...", "info")
                                await b.hover(); await self.page.wait_for_timeout(300)
                                await b.evaluate('(el) => { el.removeAttribute("disabled"); el.classList.remove("disabled"); }')
                                await b.focus(); await self.page.keyboard.press("Enter"); await self.page.wait_for_timeout(500)
                                if not done: await b.evaluate('(el) => el.click()'); await b.click(force=True, timeout=500)
                                await self.page.wait_for_timeout(2000)
                                if done: break
                                for fc in frames:
                                    ok = fc.locator('button, a, span, [role="button"]').filter(has_text=re.compile(r'^ok$|^sim$|confirma', re.IGNORECASE))
                                    if await ok.count() > 0 and await ok.first.is_visible(timeout=200):
                                        emit("      ✅ Registro confirmado via modal!", "ok"); done = True; await ok.first.click(force=True); break
                    except: pass
            if not done: raise RuntimeError("Não foi possível acionar o botão REGISTRAR.")
        finally:
            self.page.remove_listener("dialog", handle_dialog)
            await self.page.wait_for_timeout(1500); await self._fechar_modal_sessao()

    async def baixar_boleto(self, pasta, nome, downloads_temp=None) -> Path:
        emit(f"  📥 Preparando captura do PDF...", "info"); await self._fechar_modal_sessao()
        cand = gerar_nome_pdf(pasta, nome)
        frames = [self.page] + self.page.frames; alvo = None
        sels = ['div[aria-label="Botao gerar imprimir boleto avulso"] em', 'div[aria-label="Botao gerar imprimir boleto avulso"]', 'div[ng-click*="clicarBotaoImprimirBoletoAvulsoJsPDF"]']
        for _ in range(6):
            for t in frames:
                for s in sels:
                    try:
                        loc = t.locator(s)
                        if await loc.count() > 0:
                            for i in range(await loc.count()):
                                b = loc.nth(i)
                                if await b.is_visible(timeout=300): alvo = b; break
                        if alvo: break
                    except: pass
                if alvo: break
            if alvo: break
            await self.page.wait_for_timeout(1000)
        if not alvo: raise RuntimeError("Botão de PDF não encontrado na tela final.")
        antes = set(os.listdir(downloads_temp)) if downloads_temp else set()
        try:
            await alvo.evaluate("(el) => { const d = el.closest('div[ng-click]'); if(d){ d.removeAttribute('disabled'); d.classList.remove('disabled'); const s = angular.element(d).scope(); if(s && s.vm && s.vm.ST){ try { s.vm.ST.ESTADO.RSPT.IMPR.Imprimindo = false; } catch(e){} } } el.scrollIntoView({block: 'center'}); el.focus(); }")
            emit("      👉 Solicitando arquivo ao Banco...", "info")
            await self.page.wait_for_timeout(800)
            f_dl = asyncio.create_task(self.page.wait_for_event("download", timeout=30000))
            f_pp = asyncio.create_task(self.page.wait_for_event("popup", timeout=30000))
            try: await alvo.click(force=True, timeout=5000)
            except: pass
            try: await self.page.keyboard.press("Enter")
            except: pass
            done, pending = await asyncio.wait([f_dl, f_pp], return_when=asyncio.FIRST_COMPLETED, timeout=10)
            if done:
                for p in pending: p.cancel()
                res = list(done)[0].result()
                if hasattr(res, 'save_as'):
                    await res.save_as(cand); emit(f"      ✅ PDF SALVO: {cand.name}", "ok"); return cand
                else:
                    await res.wait_for_load_state('networkidle'); await res.pdf(path=str(cand)); await res.close(); emit(f"      ✅ PDF SALVO (via Popup): {cand.name}", "ok"); return cand
            for p in pending: p.cancel()
            if downloads_temp:
                start = time.time()
                while time.time() - start < 15:
                    novos = set(os.listdir(downloads_temp)) - antes
                    if novos:
                        m = Path(max([os.path.join(downloads_temp, f) for f in novos], key=os.path.getctime))
                        shutil.move(str(m), str(cand)); emit(f"      ✅ PDF RESGATADO da pasta local: {cand.name}", "ok"); return cand
                    await asyncio.sleep(1)
            raise RuntimeError("Download do PDF falhou (tempo esgotado).")
        except Exception as e: raise RuntimeError(f"Erro ao processar PDF: {e}")

# ===========================================================================
#  MAIN LOOP (ENTRADA DO WRAPPER)
# ===========================================================================
async def main():
    if len(sys.argv) < 2: return
    caminho = sys.argv[1]
    # Início do processamento
    emit("-" * 52, "info")
    emit("🚀 [SISTEMA] Motor USEPONTOX Ativado: Modo Estabilidade Máxima", "info")
    emit("-" * 52, "info")
    
    if not os.path.exists(caminho): 
        emit(f"❌ [ERRO] Planilha '{caminho}' não encontrada no diretório esperado.", "error")
        return
        
    dados = carregar_planilha(caminho)
    
    # Filtros
    filtro_set = set()
    if len(sys.argv) > 2 and sys.argv[2].strip():
        for token in [t.strip() for t in sys.argv[2].split(',')]:
            m_range = re.split(r'[-/]', token)
            if len(m_range) == 2:
                try:
                    i = int(re.sub(r'\D', '', m_range[0])); f = int(re.sub(r'\D', '', m_range[1]))
                    for num in range(min(i, f), max(i, f) + 1): filtro_set.add(str(num))
                except: filtro_set.add(token.replace('.','').replace(',',''))
            else:
                nn = token.replace('.','').replace(',','').split('.')[0]
                if nn: filtro_set.add(nn)
    if filtro_set:
        dados_f = {}
        for d, bs in dados.items():
            sel = [b for b in bs if b['nosso_numero'] in filtro_set or re.sub(r'\D','',b['nosso_numero']) in filtro_set]
            if sel: dados_f[d] = sel
        dados = dados_f
    if len(sys.argv) > 3 and sys.argv[3].strip():
        ddds = [d.strip() for d in sys.argv[3].split(',')]
        dados = {k: v for k, v in dados.items() if k in ddds}

    total = sum(len(v) for v in dados.values())
    emit(f"📄 [CARGA] Planilha: {os.path.basename(caminho)} | Alvo: {total} boletos localizados", "info")
    
    chrome_paths = [r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe", os.path.join(os.environ.get("LOCALAPPDATA", ""), r"Google\Chrome\Application\chrome.exe")]
    c_path = next((p for p in chrome_paths if os.path.exists(p)), None)
    
    async with async_playwright() as pw:
        user_data = os.path.join(os.environ["LOCALAPPDATA"], "Google", "Chrome", "User Data Bot")
        dl_temp = str(DATA_DIR / "downloads_temp")
        os.makedirs(dl_temp, exist_ok=True)
        
        ctx = await pw.chromium.launch_persistent_context(user_data_dir=user_data, executable_path=c_path, headless=False, channel="chrome", no_viewport=True, accept_downloads=True, downloads_path=dl_temp, args=["--start-maximized", "--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-popup-blocking"])
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        
        await page.goto("https://autoatendimento.bb.com.br/")
        emit("🌐 [NAVEGAÇÃO] Portal Banco do Brasil aberto. Aguardando login manual...", "info")
        emit("__AGUARDANDO_LOGIN__", "warn")
        
        while not SIGNAL_LOGIN_OK.exists():
            if SIGNAL_STOP.exists(): await ctx.close(); return
            await asyncio.sleep(1)
            
        # Tenta apagar o sinal, mas ignora se estiver travado (Windows Lock)
        try:
            await asyncio.sleep(0.5)
            SIGNAL_LOGIN_OK.unlink()
        except: pass
        
        emit("🔑 [ACESSO] Login confirmado! Sincronizando motor de automação...", "ok")
        target_page = next((p for p in ctx.pages if 'bb.com.br' in p.url), page)
        bot = GeradorBoletos(target_page)
        await bot.iniciar_keepalive()
        
        hist = carregar_historico(); g = 0; e = 0
        
        for ddd, bs in dados.items():
            pasta = PASTAS_DDD.get(ddd)
            if not pasta: continue
            for b in bs:
                nn = b['nosso_numero']
                if nn in hist: 
                    emit(f"⏭️  [PULO] Boleto {nn} (DDD {ddd}) já consta no histórico.", "info")
                    continue
                
                emit(f"\n⚡ [EXECUÇÃO] Iniciando Processamento: {nn} | Valor: R$ {b['valor']}", "info")
                tents = 0
                while tents < 3:
                    try:
                        if g > 0 and await bot.clicar_novo_registro(): pass
                        else: await bot.abrir_gerar_boleto()
                        await bot.tela_inicial_prosseguir()
                        await bot.preencher_parte1(nn, b['valor'], b['vencimento'])
                        await bot.preencher_parte2(b['nome'])
                        if await bot.preencher_parte3(b['cnpj'], b['nome']):
                            await bot.registrar_boleto()
                            await bot.baixar_boleto(pasta, b['nome'], dl_temp)
                            salvar_historico(nn); hist.add(nn); g += 1
                            emit(f"✅ [SUCESSO] Boleto {nn} (DDD {ddd}) CONCLUÍDO! ({g}/{total})", "ok")
                            break
                        else: 
                            raise RuntimeError("Fluxo interrompido no Passo 3.")
                    except Exception as err:
                        tents += 1
                        emit(f"❌ [FALHA] Tentativa {tents}/3 em {nn}: {err}", "error")
                        if tents >= 3: 
                            e += 1
                            break
                        else: 
                            emit("🔄 [RETRY] Sincronizando motor... Reiniciando em 5s.", "warn")
                            await asyncio.sleep(5)
                            
        await bot.parar_keepalive()
        await ctx.close()
        emit("-" * 52, "info")
        emit(f"🏁 [FINALIZADO] Operação encerrada. Sucesso: {g} | Erros: {e}", "ok")
        emit("-" * 52, "info")

if __name__ == '__main__':
    try: asyncio.run(main())
    except Exception as e:
        import traceback; emit(f"❌ ERRO GRAVE: {e}\n{traceback.format_exc()}", "error")
