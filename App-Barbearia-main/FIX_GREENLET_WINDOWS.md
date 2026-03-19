# 🔧 Fix: Erro Greenlet no Windows

## ❌ Erro:
```
ValueError: the greenlet library is required to use this function. 
DLL load failed while importing _greenlet: Não foi possível encontrar o módulo especificado.
```

## ✅ Soluções (tente na ordem)

### Solução 1: Reinstalar Greenlet (Mais Comum)

```bash
# Desinstalar greenlet
pip uninstall greenlet -y

# Instalar versão específica que funciona no Windows
pip install greenlet==3.0.3

# Testar
python -c "import greenlet; print('Greenlet OK!')"
```

### Solução 2: Instalar Visual C++ Redistributable

O greenlet precisa de bibliotecas C++ do Windows.

**Baixe e instale:**
- [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)

Depois:
```bash
pip install --upgrade --force-reinstall greenlet
```

### Solução 3: Usar Python 3.11 ou 3.10

Se você está usando Python 3.12, pode ter incompatibilidade.

```bash
# Verificar versão
python --version

# Se for 3.12, considere usar 3.11 ou 3.10
# Baixe em: https://www.python.org/downloads/
```

### Solução 4: Reinstalar todas as dependências

```bash
# No diretório backend, com venv ativado:
pip uninstall -r requirements.txt -y
pip cache purge
pip install -r requirements.txt
```

### Solução 5: Forçar instalação com --no-cache

```bash
pip install --no-cache-dir --force-reinstall greenlet sqlalchemy asyncpg
```

## 🧪 Testar se funcionou

```bash
# Teste 1: Importar greenlet
python -c "import greenlet; print('✅ Greenlet OK!')"

# Teste 2: Testar database
python -c "from database import engine; print('✅ Database OK!')"

# Teste 3: Inicializar banco (se tiver NeonDB configurado)
python -c "from database import init_db; import asyncio; asyncio.run(init_db()); print('✅ Banco inicializado!')"
```

## 🚀 Alternativa: Rodar direto sem testar

Se nenhuma solução funcionar, você pode simplesmente rodar o backend:

```bash
uvicorn server:app --reload --port 8001
```

O banco será inicializado automaticamente quando o backend iniciar!

## 📋 Checklist de Verificação

- [ ] Python 3.10 ou 3.11 instalado (não 3.12)
- [ ] Visual C++ Redistributable instalado
- [ ] Greenlet 3.0.3 instalado
- [ ] Ambiente virtual ativado
- [ ] Todas as dependências instaladas

## 💡 Dica Extra

Se continuar com problema, pule o teste e vá direto para:

```bash
# Configure o .env com seu NeonDB
DATABASE_URL=postgresql+asyncpg://user:pass@host.neon.tech/db

# Rode o backend direto
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

O backend mostrará se conectou com sucesso ao banco nos logs!
