"""Supabase Storage service for file uploads"""
import os
import uuid
import logging
import httpx

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

BUCKETS = ["product-images", "barbershop-logos", "service-photos"]


def _headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }


async def ensure_buckets():
    """Create storage buckets if they don't exist"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("Supabase not configured, skipping bucket init")
        return
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            for bucket in BUCKETS:
                r = await client.post(
                    f"{SUPABASE_URL}/storage/v1/bucket",
                    headers=_headers(),
                    json={"id": bucket, "name": bucket, "public": True},
                )
                if r.status_code in (200, 201):
                    logger.info(f"Bucket '{bucket}' created")
                elif r.status_code == 409:
                    logger.info(f"Bucket '{bucket}' already exists")
                else:
                    logger.warning(f"Bucket '{bucket}': {r.status_code} {r.text}")
    except Exception as e:
        logger.error(f"Bucket init error: {e}")


async def upload_file(bucket: str, file_data: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    """Upload file to Supabase Storage, return public URL"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Supabase not configured")

    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    path = f"{uuid.uuid4()}.{ext}"

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}",
            headers={**_headers(), "Content-Type": content_type},
            content=file_data,
        )
        if r.status_code not in (200, 201):
            raise RuntimeError(f"Upload failed: {r.status_code} {r.text}")

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"
    return public_url


async def delete_file(bucket: str, path: str):
    """Delete a file from Supabase Storage"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    filename = path.split("/")[-1]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.delete(
                f"{SUPABASE_URL}/storage/v1/object/{bucket}/{filename}",
                headers=_headers(),
            )
    except Exception as e:
        logger.error(f"Delete error: {e}")
