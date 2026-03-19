from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pathlib import Path
import logging

from database import init_db, close_db
from config import get_settings
from routes import auth_routes, service_routes, product_routes, appointment_routes, public_appointments_routes
from routes import cash_register_routes, service_history_routes, push_token_routes


# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown"""
    logger.info("Starting Barbershop API...")
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
    
    yield
    
    logger.info("Shutting down Barbershop API...")
    await close_db()

# Create FastAPI app
app = FastAPI(
    title="Barbershop Manager API",
    description="API for barbershop management system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["http://localhost:3001", "http://10.0.0.173:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(auth_routes.router, prefix="/api")
app.include_router(service_routes.router, prefix="/api")
app.include_router(product_routes.router, prefix="/api")
app.include_router(appointment_routes.router, prefix="/api")
app.include_router(cash_register_routes.router, prefix="/api")
app.include_router(service_history_routes.router, prefix="/api")
app.include_router(push_token_routes.router, prefix="/api")
app.include_router(public_appointments_routes.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Barbershop Manager API",
        "version": "1.0.0"
    }

@app.get("/api")
async def root():
    """Root endpoint"""
    return {
        "message": "Barbershop Manager API",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.post("/api/auth/callback")
async def auth_callback(request: Request):
    data = await request.json()
    session_id = data.get("session_id")
    # Aqui você deve validar o session_id e buscar o usuário
    # Exemplo de resposta de sucesso:
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID não informado")
    # TODO: validar session_id e buscar usuário real
    # Retorne o token real do usuário autenticado
    return {"session_token": f"token_para_{session_id}"}
