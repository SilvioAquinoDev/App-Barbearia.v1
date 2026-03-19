import asyncio
import sys
from database import engine
from sqlalchemy import text

async def run_migration():
    """Executa migrações manuais no banco de dados"""
    print("🚀 Iniciando migração do banco de dados...")
    
    async with engine.begin() as conn:
        try:
            # Verificar se as colunas já existem
            check_columns = await conn.execute(
                text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'appointments'
                """)
            )
            existing_columns = [row[0] for row in check_columns]
            print(f"📊 Colunas existentes: {existing_columns}")
            
            # Adicionar client_name se não existir
            if 'client_name' not in existing_columns:
                print("➕ Adicionando coluna client_name...")
                await conn.execute(
                    text("ALTER TABLE appointments ADD COLUMN client_name VARCHAR(255)")
                )
            
            # Adicionar client_phone se não existir
            if 'client_phone' not in existing_columns:
                print("➕ Adicionando coluna client_phone...")
                await conn.execute(
                    text("ALTER TABLE appointments ADD COLUMN client_phone VARCHAR(20)")
                )
            
            # Adicionar client_email se não existir
            if 'client_email' not in existing_columns:
                print("➕ Adicionando coluna client_email...")
                await conn.execute(
                    text("ALTER TABLE appointments ADD COLUMN client_email VARCHAR(255)")
                )
            
            # Adicionar is_guest se não existir
            if 'is_guest' not in existing_columns:
                print("➕ Adicionando coluna is_guest...")
                await conn.execute(
                    text("ALTER TABLE appointments ADD COLUMN is_guest BOOLEAN DEFAULT FALSE")
                )
            
            # Modificar client_id para permitir nulo
            print("🔄 Modificando client_id para aceitar NULL...")
            await conn.execute(
                text("ALTER TABLE appointments ALTER COLUMN client_id DROP NOT NULL")
            )
            
            print("✅ Migração concluída com sucesso!")
            
        except Exception as e:
            print(f"❌ Erro durante migração: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(run_migration()) 