from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
import base64

from database import get_db
from auth import get_current_barber
from models import Product
from schemas import ProductCreate, ProductUpdate, ProductResponse
from services.supabase_storage import upload_file

router = APIRouter(prefix="/products", tags=["products"])


class ImageUpload(BaseModel):
    image_data: str  # base64 encoded
    filename: Optional[str] = None

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Create a new product"""
    
    product = Product(**product_data.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    
    return product

@router.get("/", response_model=List[ProductResponse])
async def list_products(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """List all products"""
    
    query = select(Product)
    if active_only:
        query = query.where(Product.is_active == True)
    
    result = await db.execute(query)
    products = result.scalars().all()
    
    return products

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get product by ID"""
    
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Update product"""
    
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Update fields
    update_data = product_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    await db.commit()
    await db.refresh(product)
    
    return product

@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Delete product (soft delete)"""
    
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    product.is_active = False
    await db.commit()
    
    return {"message": "Product deleted successfully"}

@router.put("/{product_id}/toggle-active", response_model=ProductResponse)
async def toggle_product_active(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Toggle product active status"""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = not product.is_active
    await db.commit()
    await db.refresh(product)
    return product


@router.post("/upload-image")
async def upload_product_image(
    data: ImageUpload,
    current_user=Depends(get_current_barber),
):
    """Upload a product image, returns the URL path"""
    try:
        # Remove data URI prefix if present
        image_b64 = data.image_data
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]

        image_bytes = base64.b64decode(image_b64)
        ext = "jpg"
        content_type = "image/jpeg"
        if image_bytes[:4] == b"\x89PNG":
            ext = "png"
            content_type = "image/png"
        elif image_bytes[:4] == b"RIFF":
            ext = "webp"
            content_type = "image/webp"

        image_url = await upload_file("product-images", image_bytes, f"product.{ext}", content_type)
        return {"image_url": image_url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao salvar imagem: {str(e)}")


@router.post("/{product_id}/sell")
async def sell_product(
    product_id: int,
    quantity: int = 1,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Sell a product (reduce stock, record sale in DB)"""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock < quantity:
        raise HTTPException(status_code=400, detail=f"Estoque insuficiente. Disponível: {product.stock}")
    product.stock -= quantity
    total = float(product.price) * quantity
    
    # Save sale record
    from models import ProductSale
    sale = ProductSale(
        product_id=product_id,
        barber_id=current_user.user_id,
        quantity=quantity,
        unit_price=float(product.price),
        total_price=total,
    )
    db.add(sale)
    await db.commit()
    await db.refresh(product)
    return {"message": f"Venda registrada: {quantity}x {product.name}", "total": total, "remaining_stock": product.stock}

