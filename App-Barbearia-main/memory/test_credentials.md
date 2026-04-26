# Test Credentials

## Authentication
- Auth methods:
  1. Google OAuth direct (POST /api/auth/google with {credential: "google_id_token"})
  2. Legacy Emergent Auth (POST /api/auth/session with session_id) - backward compatible
- Google Client ID: empty (user needs to add GOOGLE_CLIENT_ID in backend/.env)

## Active Test Sessions
- Barber (silvios.aquino@gmail.com): `session_test_barber_62d082eb` (expires 2026-04-29)
- Client (silvio.aquinodev@gmail.com): `session_test_client_68f69fcd` (expires 2026-04-29)

## How to authenticate in curl:
```bash
curl -H "Authorization: Bearer session_test_barber_62d082eb" https://gestao-app-1.preview.emergentagent.com/api/...
```

## Web Client URL
- `https://gestao-app-1.preview.emergentagent.com/api/web/`

## API Base URL
- `https://gestao-app-1.preview.emergentagent.com/api`

## Test Users in DB
| user_id | email | name | role | barbershop_id |
|---------|-------|------|------|---------------|
| user_3085c31d7fe8 | silvios.aquino@gmail.com | Silvio Aquino | barber | 1 |
| user_e8d1b1eb2bea | silvio.aquinodev@gmail.com | Silvio Test Updated | client | NULL |

## Environment Variables (backend/.env)
- GOOGLE_CLIENT_ID= (user must add)
- GOOGLE_CLIENT_SECRET= (user must add)
- MERCADOPAGO_TOKEN= (user must add)
- SUPABASE_URL= (configured)
- SUPABASE_SERVICE_KEY= (configured)
