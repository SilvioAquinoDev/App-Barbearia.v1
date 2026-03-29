from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pathlib import Path
import logging
import asyncio

from database import init_db, close_db
from config import get_settings
from routes import auth_routes, service_routes, product_routes, appointment_routes
from routes import cash_register_routes, service_history_routes, push_token_routes
from routes import public_routes, schedule_routes, whatsapp_routes, product_sale_routes
from routes import loyalty_routes, promotion_routes, report_routes, photo_routes
from routes import barbershop_routes
from services.reminder_scheduler import reminder_scheduler_loop, send_appointment_reminders

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
    
    # Start background reminder scheduler
    reminder_task = asyncio.create_task(reminder_scheduler_loop())
    
    yield
    
    # Cancel the scheduler on shutdown
    reminder_task.cancel()
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
    allow_origins=["http://127.0.0.1:8081","http://localhost:3001","http://localhost:8081","http://10.0.0.179:8081","http://192.168.1.7:8081","http://10.0.0.179:3001","http://192.168.1.7:3001"],
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
app.include_router(public_routes.router, prefix="/api")
app.include_router(schedule_routes.router, prefix="/api")
app.include_router(whatsapp_routes.router, prefix="/api")
app.include_router(product_sale_routes.router, prefix="/api")
app.include_router(loyalty_routes.router, prefix="/api")
app.include_router(promotion_routes.router, prefix="/api")
app.include_router(report_routes.router, prefix="/api")
app.include_router(photo_routes.router, prefix="/api")

# Clients routes
from routes import clients_routes
app.include_router(clients_routes.router, prefix="/api")

# Barbershop routes
app.include_router(barbershop_routes.router, prefix="/api")

# Serve uploaded product images
uploads_dir = ROOT_DIR / "uploads" / "products"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads/products", StaticFiles(directory=str(uploads_dir)), name="product-uploads")

# Serve uploaded barbershop logos
barbershop_uploads = ROOT_DIR / "uploads" / "barbershop"
barbershop_uploads.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads/barbershop", StaticFiles(directory=str(barbershop_uploads)), name="barbershop-uploads")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Barbershop Manager API",
        "version": "1.0.0"
    }

@app.post("/api/appointments/send-reminders")
async def trigger_reminders():
    """Manual trigger for sending appointment reminders (for testing)"""
    await send_appointment_reminders()
    return {"message": "Verificação de lembretes executada"}

@app.get("/api")
async def root():
    """Root endpoint"""
    return {
        "message": "Barbershop Manager API",
        "docs": "/docs",
        "health": "/api/health"
    }
