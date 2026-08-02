# API Reference — Flash Cell Store

Base URL em desenvolvimento: `http://localhost:3001`  
Base URL em produção: `https://api.seudominio.com`

Todos os endpoints seguem o prefixo `/api`.

---

## Convenções

### Formato de resposta

```json
// Sucesso
{ "status": "ok", "data": { ... } }

// Lista paginada
{
  "status": "ok",
  "data": [...],
  "meta": { "total": 100, "page": 1, "perPage": 20, "totalPages": 5 }
}

// Erro
{ "status": "error", "message": "Descrição do erro." }
```

### Autenticação

Rotas protegidas exigem o header:

```
Authorization: Bearer <accessToken>
```

### Paginação (padrão para listas)

```
GET /api/products?page=1&perPage=20
```

### Papéis de acesso

| Role | Acesso |
|---|---|
| `admin` | Acesso total |
| `technician` | Ordens de serviço, estoque (leitura), produtos (leitura) |
| `customer` | Próprios pedidos, carrinho, perfil |

---

## Endpoints implementados ✅

### Health

#### `GET /api/health`

Verifica se a API está no ar.

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2026-07-27T00:00:00.000Z",
  "environment": "development",
  "version": "0.0.1"
}
```

---

### Autenticação

#### `POST /api/auth/register`

Cria uma nova conta de cliente.

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "Senha@123",
  "phone": "11999990000"
}
```

**Validações:**
- `name`: mínimo 2 caracteres
- `email`: formato válido
- `password`: mínimo 8 caracteres, 1 maiúscula, 1 número
- `phone`: opcional

**Resposta `201`:**
```json
{
  "status": "ok",
  "data": {
    "user": { "id": "uuid", "email": "joao@email.com", "role": "customer" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Erros:**
- `400` — Dados inválidos
- `409` — E-mail já cadastrado

---

#### `POST /api/auth/login`

Autentica um usuário existente.

**Body:**
```json
{
  "email": "admin@flashcell.com",
  "password": "Admin@12345"
}
```

**Resposta `200`:**
```json
{
  "status": "ok",
  "data": {
    "user": { "id": "uuid", "email": "admin@flashcell.com", "role": "admin" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Erros:**
- `400` — Dados inválidos
- `401` — Credenciais incorretas
- `403` — Conta desativada

---

#### `POST /api/auth/refresh`

Renova o par de tokens usando o refresh token.

**Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Resposta `200`:**
```json
{
  "status": "ok",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Erros:**
- `400` — Token não informado
- `401` — Token inválido ou expirado

---

#### `GET /api/auth/me`

🔒 Requer autenticação.

Retorna os dados do usuário autenticado com seu perfil.

**Resposta `200`:**
```json
{
  "status": "ok",
  "data": {
    "id": "uuid",
    "email": "admin@flashcell.com",
    "role": "admin",
    "isActive": true,
    "profile": {
      "name": "Administrador",
      "phone": "11999990000",
      "avatarUrl": null
    }
  }
}
```

---

## Endpoints planejados ⏳

> Os endpoints abaixo estão documentados por contrato. A implementação ocorrerá nas etapas 3 a 9 do roadmap.

---

### Catálogo — Marcas

#### `GET /api/brands`
Lista todas as marcas ativas. Acesso público.

**Query params:** `page`, `perPage`, `search`, `isActive`

#### `GET /api/brands/:id`
Detalhe de uma marca. Acesso público.

#### `POST /api/brands`
🔒 Admin. Cria nova marca.

**Body:** `{ name, slug, logoUrl? }`

#### `PUT /api/brands/:id`
🔒 Admin. Atualiza marca.

#### `DELETE /api/brands/:id`
🔒 Admin. Remove marca (soft delete via `is_active = false`).

---

### Catálogo — Categorias

#### `GET /api/categories`
Lista categorias em árvore hierárquica. Acesso público.

**Query params:** `flat` (boolean — retorna lista em vez de árvore)

#### `GET /api/categories/:id`
Detalhe de uma categoria com subcategorias. Acesso público.

#### `POST /api/categories`
🔒 Admin.

**Body:** `{ name, slug, parentId?, description?, imageUrl?, sortOrder? }`

#### `PUT /api/categories/:id`
🔒 Admin.

#### `DELETE /api/categories/:id`
🔒 Admin. Filhos ficam com `parent_id = null`.

---

### Catálogo — Produtos

#### `GET /api/products`
Lista produtos. Acesso público.

**Query params:** `page`, `perPage`, `search`, `brandId`, `categoryId`, `isFeatured`, `isActive`, `minPrice`, `maxPrice`, `sortBy` (price_asc, price_desc, name, created_at)

#### `GET /api/products/:id`
Detalhe do produto com imagens e estoque. Acesso público.

#### `GET /api/products/slug/:slug`
Busca por slug (para URLs amigáveis). Acesso público.

#### `POST /api/products`
🔒 Admin.

**Body:** `{ name, slug, brandId?, categoryId?, sku?, description?, sellPrice, costPrice?, isService?, ... }`

#### `PUT /api/products/:id`
🔒 Admin.

#### `DELETE /api/products/:id`
🔒 Admin. Soft delete.

#### `POST /api/products/:id/images`
🔒 Admin. Adiciona imagem ao produto.

**Body:** `{ url, altText?, sortOrder?, isPrimary? }`

#### `DELETE /api/products/:productId/images/:imageId`
🔒 Admin.

---

### Estoque

#### `GET /api/stock`
🔒 Staff. Lista todos os produtos com saldo de estoque.

**Query params:** `lowStock` (boolean — apenas abaixo do mínimo)

#### `GET /api/stock/:productId`
🔒 Staff. Saldo de um produto.

#### `PUT /api/stock/:productId`
🔒 Admin. Atualiza limites de estoque (min/max/localização).

#### `POST /api/stock/movements`
🔒 Staff. Registra movimentação de estoque.

**Body:** `{ productId, type, quantity, supplierId?, reference?, notes?, unitCost? }`

#### `GET /api/stock/movements`
🔒 Staff. Histórico de movimentações.

**Query params:** `productId`, `type`, `startDate`, `endDate`, `page`, `perPage`

---

### Fornecedores

#### `GET /api/suppliers`
🔒 Staff. Lista fornecedores.

#### `GET /api/suppliers/:id`
🔒 Staff.

#### `POST /api/suppliers`
🔒 Admin.

#### `PUT /api/suppliers/:id`
🔒 Admin.

---

### Clientes

#### `GET /api/customers`
🔒 Staff. Lista clientes.

**Query params:** `search` (nome, e-mail, documento), `page`, `perPage`

#### `GET /api/customers/:id`
🔒 Staff. Detalhe com endereços e histórico.

#### `POST /api/customers`
🔒 Staff. Cria cliente (balcão).

#### `PUT /api/customers/:id`
🔒 Staff.

#### `GET /api/customers/:id/addresses`
🔒 Staff.

#### `POST /api/customers/:id/addresses`
🔒 Staff/Customer (próprio).

#### `PUT /api/customers/:customerId/addresses/:addressId`
🔒 Staff/Customer (próprio).

#### `DELETE /api/customers/:customerId/addresses/:addressId`
🔒 Staff/Customer (próprio).

---

### Ordens de Serviço

#### `GET /api/service-orders`
🔒 Staff. Lista OS com filtros.

**Query params:** `status`, `technicianId`, `customerId`, `search` (número, aparelho), `startDate`, `endDate`, `page`, `perPage`

#### `GET /api/service-orders/:id`
🔒 Staff. Detalhe completo (diagnósticos, serviços, peças, histórico, checklists).

#### `POST /api/service-orders`
🔒 Staff. Abre nova OS.

**Body:** `{ customerId, deviceType, deviceBrand, deviceModel, deviceColor?, deviceImei?, customerComplaint?, ... }`

#### `PUT /api/service-orders/:id`
🔒 Staff. Atualiza dados gerais.

#### `PATCH /api/service-orders/:id/status`
🔒 Staff. Altera status da OS.

**Body:** `{ status, notes? }`

#### `POST /api/service-orders/:id/diagnoses`
🔒 Staff. Adiciona diagnóstico.

#### `POST /api/service-orders/:id/services`
🔒 Staff. Adiciona serviço executado.

#### `POST /api/service-orders/:id/parts`
🔒 Staff. Adiciona peça usada.

#### `PUT /api/service-orders/:id/entry-checklist`
🔒 Staff.

#### `PUT /api/service-orders/:id/exit-checklist`
🔒 Staff.

#### `GET /api/service-orders/:id/pdf`
🔒 Staff. Gera PDF da OS.

---

### Pedidos (E-commerce)

#### `GET /api/orders`
🔒 Admin/Staff. Lista todos os pedidos.

#### `GET /api/orders/my`
🔒 Customer. Pedidos do cliente autenticado.

#### `GET /api/orders/:id`
🔒 Admin/Staff ou Customer (próprio).

#### `POST /api/orders`
🔒 Customer. Cria pedido a partir do carrinho.

**Body:** `{ addressId, couponCode?, notes? }`

#### `PATCH /api/orders/:id/status`
🔒 Admin.

#### `POST /api/orders/:id/cancel`
🔒 Customer (próprio, se ainda pendente) / Admin.

---

### Carrinho

#### `GET /api/cart`
🔒 Customer. Carrinho do usuário autenticado (ou por session_id).

#### `POST /api/cart/items`
Adiciona item ao carrinho.

**Body:** `{ productId, quantity }`

#### `PUT /api/cart/items/:itemId`
Atualiza quantidade.

#### `DELETE /api/cart/items/:itemId`
Remove item.

#### `DELETE /api/cart`
Limpa o carrinho.

#### `POST /api/cart/coupon`
Aplica cupom.

**Body:** `{ code }`

---

### Favoritos

#### `GET /api/favorites`
🔒 Customer.

#### `POST /api/favorites`
🔒 Customer.

**Body:** `{ productId }`

#### `DELETE /api/favorites/:productId`
🔒 Customer.

---

### Cupons

#### `GET /api/coupons`
🔒 Admin. Lista cupons.

#### `POST /api/coupons`
🔒 Admin. Cria cupom.

#### `PUT /api/coupons/:id`
🔒 Admin.

#### `POST /api/coupons/validate`
Valida se um cupom é aplicável ao carrinho atual.

**Body:** `{ code, orderValue }`

---

### Garantias

#### `GET /api/warranties`
🔒 Staff. Lista garantias.

#### `POST /api/warranties`
🔒 Staff. Registra garantia.

#### `PATCH /api/warranties/:id/claim`
🔒 Staff. Aciona garantia.

---

### Configurações da Loja

#### `GET /api/store/settings`
Acesso público. Retorna configurações públicas (nome, logo, etc.).

#### `PUT /api/store/settings`
🔒 Admin. Atualiza configurações.

#### `GET /api/store/banners`
Acesso público. Lista banners ativos por posição.

**Query params:** `position`

#### `POST /api/store/banners`
🔒 Admin.

#### `PUT /api/store/banners/:id`
🔒 Admin.

#### `DELETE /api/store/banners/:id`
🔒 Admin.

---

### Técnicos

#### `GET /api/technicians`
🔒 Admin.

#### `POST /api/technicians`
🔒 Admin. Vincula usuário como técnico.

**Body:** `{ userId, specialties? }`

#### `PUT /api/technicians/:id`
🔒 Admin.

---

### Relatórios (Admin)

#### `GET /api/reports/dashboard`
🔒 Admin. Métricas gerais (vendas, OS abertas, estoque baixo, etc.).

#### `GET /api/reports/sales`
🔒 Admin. Relatório de vendas por período.

**Query params:** `startDate`, `endDate`, `groupBy` (day, week, month)

#### `GET /api/reports/service-orders`
🔒 Admin. Métricas de ordens de serviço.

#### `GET /api/reports/stock`
🔒 Admin. Relatório de estoque (abaixo do mínimo, mais vendidos, etc.).

---

### Perfil do usuário

#### `GET /api/profile`
🔒 Customer. Perfil do usuário autenticado.

#### `PUT /api/profile`
🔒 Customer. Atualiza nome, telefone, etc.

#### `PUT /api/profile/password`
🔒 Customer. Altera senha.

**Body:** `{ currentPassword, newPassword }`

---

### Gestão de usuários (Admin)

#### `GET /api/users`
🔒 Admin.

#### `GET /api/users/:id`
🔒 Admin.

#### `PUT /api/users/:id`
🔒 Admin. Altera role, ativa/desativa.

---

### Logs do sistema

#### `GET /api/logs`
🔒 Admin.

**Query params:** `level`, `action`, `entity`, `userId`, `startDate`, `endDate`, `page`, `perPage`
