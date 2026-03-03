from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import Appointment, PushToken, User, Service
from notification_service import notification_service

router = APIRouter(prefix="/public-appointments", tags=["public-appointments"])

# Schema para agendamento público
class PublicAppointmentCreate(BaseModel):
    service_id: int
    scheduled_time: datetime
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    notes: Optional[str] = None

class PublicAppointmentResponse(BaseModel):
    id: int
    service_id: int
    scheduled_time: datetime
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

async def send_public_appointment_notifications(
    appointment_id: int,
    client_name: str,
    client_phone: str,
    scheduled_time: datetime,
    service_name: str,
    db: AsyncSession
):
    """Background task to send notifications for public appointments"""
    try:
        # Get all barber tokens
        result = await db.execute(
            select(PushToken, User).join(
                User, PushToken.user_id == User.user_id
            ).where(
                (User.role == "barber") &
                (PushToken.is_active == True)
            )
        )
        tokens = [row[0].token for row in result.all()]
        
        if tokens:
            # Format appointment data for notification
            formatted_time = scheduled_time.strftime("%d/%m/%Y %H:%M")
            
            await notification_service.send_appointment_notification(
                tokens=tokens,
                appointment_data={
                    "id": appointment_id,
                    "scheduled_time": formatted_time,
                    "client_name": client_name,
                    "client_phone": client_phone,
                    "service_name": service_name,
                    "type": "public_booking"  # Identifica que é um agendamento público
                }
            )
    except Exception as e:
        print(f"Error sending public appointment notifications: {e}")

async def send_confirmation_to_client(
    client_name: str,
    client_phone: str,
    client_email: Optional[str],
    scheduled_time: datetime,
    service_name: str
):
    """Send confirmation to client via WhatsApp/SMS/Email"""
    try:
        formatted_time = scheduled_time.strftime("%d/%m/%Y %H:%M")
        
        # Aqui você pode implementar o envio de confirmação
        # Por exemplo, via WhatsApp (usando alguma API), SMS ou Email
        
        # Exemplo de mensagem:
        message = f"Olá {client_name}! Seu agendamento para {service_name} no dia {formatted_time} foi confirmado. Em caso de dúvidas, entre em contato."
        
        # TODO: Implementar envio real
        # - Se tiver email, enviar email
        # - Se tiver WhatsApp, enviar mensagem
        # - Ou enviar SMS
        print(f"Confirmação enviada para {client_name} ({client_phone}): {message}")
        
    except Exception as e:
        print(f"Error sending confirmation to client: {e}")

@router.post("/", response_model=PublicAppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_public_appointment(
    appointment_data: PublicAppointmentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Create a new appointment without authentication (public route)"""
    
    # Validações básicas
    if not appointment_data.client_name or not appointment_data.client_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome e telefone são obrigatórios"
        )
    
    # Verificar se o serviço existe
    service_result = await db.execute(
        select(Service).where(Service.id == appointment_data.service_id)
    )
    service = service_result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Serviço não encontrado"
        )
    
    # Verificar se o horário está disponível (opcional)
    # Você pode implementar lógica para verificar conflitos de horário
    
    # Criar o agendamento sem associar a um usuário
    appointment = Appointment(
        client_id=None,  # Nulo para agendamentos públicos
        service_id=appointment_data.service_id,
        scheduled_time=appointment_data.scheduled_time,
        notes=appointment_data.notes,
        status="pending",
        client_name=appointment_data.client_name,  # Novo campo que você precisará adicionar ao modelo
        client_phone=appointment_data.client_phone,  # Novo campo
        client_email=appointment_data.client_email,  # Novo campo
        is_guest=True  # Novo campo para identificar agendamento de visitante
    )
    
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    
    # Enviar notificações em background para os barbeiros
    background_tasks.add_task(
        send_public_appointment_notifications,
        appointment.id,
        appointment.client_name,
        appointment.client_phone,
        appointment.scheduled_time,
        service.name,
        db
    )
    
    # Enviar confirmação para o cliente
    background_tasks.add_task(
        send_confirmation_to_client,
        appointment.client_name,
        appointment.client_phone,
        appointment.client_email,
        appointment.scheduled_time,
        service.name
    )
    
    return appointment

@router.get("/{appointment_id}", response_model=PublicAppointmentResponse)
async def get_public_appointment(
    appointment_id: int,
    phone: str,  # Validação simples por telefone
    db: AsyncSession = Depends(get_db)
):
    """Get public appointment by ID (with phone validation)"""
    
    result = await db.execute(
        select(Appointment).where(
            (Appointment.id == appointment_id) &
            (Appointment.is_guest == True)  # Apenas agendamentos de visitantes
        )
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agendamento não encontrado"
        )
    
    # Validação simples por telefone
    if appointment.client_phone != phone:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Telefone não corresponde ao agendamento"
        )
    
    return appointment

@router.post("/{appointment_id}/cancel")
async def cancel_public_appointment(
    appointment_id: int,
    phone: str,
    db: AsyncSession = Depends(get_db)
):
    """Cancel public appointment (with phone validation)"""
    
    result = await db.execute(
        select(Appointment).where(
            (Appointment.id == appointment_id) &
            (Appointment.is_guest == True)
        )
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agendamento não encontrado"
        )
    
    # Validação por telefone
    if appointment.client_phone != phone:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Telefone não corresponde ao agendamento"
        )
    
    # Só pode cancelar se estiver pendente
    if appointment.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível cancelar agendamento com status {appointment.status}"
        )
    
    appointment.status = "cancelled_by_client"
    await db.commit()
    
    # Notificar barbeiros sobre o cancelamento
    # background_tasks.add_task(...)
    
    return {"message": "Agendamento cancelado com sucesso"}