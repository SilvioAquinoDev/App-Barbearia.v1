# Test Credentials

## Authentication
- Auth method: Emergent Google Auth (OAuth) - No password-based login
- Auth endpoint: `POST /api/auth/google` with `{ session_id: "..." }`

## Active Sessions (for API testing)
- Barber (silvios.aquino@gmail.com): `session_a8ed7973fbd64266ae243c4b10b4d4d4` (expires 2026-04-17)
- Client (silvio.aquinodev@gmail.com): `session_4cdb48e4f83541f2a585bac0ff874c0b` (expires 2026-04-17)

## How to authenticate in curl:
```bash
curl -H "Authorization: Bearer session_a8ed7973fbd64266ae243c4b10b4d4d4" https://gestao-app-1.preview.emergentagent.com/api/...
```

## Web Client URL
- `https://gestao-app-1.preview.emergentagent.com/api/web/`

## API Base URL
- `https://gestao-app-1.preview.emergentagent.com/api`

## Test Users in DB
| user_id | email | name | role |
|---------|-------|------|------|
| user_3085c31d7fe8 | silvios.aquino@gmail.com | Silvio Aquino | barber |
| user_e8d1b1eb2bea | silvio.aquinodev@gmail.com | Silvio Aquino | client |
| test_barber_001 | test_barber@testing.com | Test Barber | barber |
| client_test_02 | joao@test.com | Joao Santos | client |
| client_test_03 | ana@test.com | Ana Oliveira | client |
