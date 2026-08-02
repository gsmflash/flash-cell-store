# Banco de Dados — Flash Cell Store

PostgreSQL 15+ gerenciado com Drizzle ORM. Migration gerada em `backend/drizzle/0000_useful_starjammers.sql` (730 linhas SQL).

---

## Enums

| Enum | Valores |
|---|---|
| `user_role` | `admin`, `technician`, `customer` |
| `address_type` | `residential`, `commercial`, `other` |
| `document_type` | `cpf`, `cnpj` |
| `device_type` | `smartphone`, `tablet`, `smartwatch`, `laptop`, `desktop`, `other` |
| `service_order_status` | `received`, `diagnosing`, `waiting_parts`, `waiting_approval`, `approved`, `in_progress`, `done`, `delivered`, `cancelled` |
| `stock_movement_type` | `in`, `out`, `adjustment`, `return`, `loss` |
| `order_status` | `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded` |
| `payment_status` | `pending`, `paid`, `failed`, `refunded`, `cancelled` |
| `payment_method` | `credit_card`, `debit_card`, `pix`, `boleto`, `cash`, `transfer`, `other` |
| `coupon_type` | `percentage`, `fixed` |
| `warranty_type` | `manufacturer`, `store`, `service` |
| `log_level` | `debug`, `info`, `warning`, `error`, `critical` |
| `banner_position` | `home_top`, `home_middle`, `home_bottom`, `sidebar`, `category` |

---

## Módulo: Usuários

### `users`

Conta de acesso ao sistema (login, senha, papel).

| Coluna | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `email` | varchar(255) | NOT NULL | — | UNIQUE |
| `password_hash` | varchar(255) | NOT NULL | — | Hash bcrypt |
| `role` | user_role | NOT NULL | `customer` | Papel do usuário |
| `is_active` | boolean | NOT NULL | `true` | Conta ativa? |
| `email_verified_at` | timestamptz | NULL | — | Data de verificação |
| `last_login_at` | timestamptz | NULL | — | Último login |
| `created_at` | timestamptz | NOT NULL | now() | |
| `updated_at` | timestamptz | NOT NULL | now() | |

### `profiles`

Dados pessoais do usuário (nome, telefone, documento).

| Coluna | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `user_id` | uuid | NOT NULL | — | FK → users.id (CASCADE, UNIQUE) |
| `name` | varchar(255) | NOT NULL | — | Nome completo |
| `phone` | varchar(20) | NULL | — | |
| `avatar_url` | text | NULL | — | |
| `document` | varchar(20) | NULL | — | CPF ou CNPJ |
| `document_type` | document_type | NULL | — | `cpf` ou `cnpj` |
| `birth_date` | date | NULL | — | |
| `created_at` | timestamptz | NOT NULL | now() | |
| `updated_at` | timestamptz | NOT NULL | now() | |

**Relacionamentos:**
- `users` → `profiles` : 1:1 (cascade delete)

---

## Módulo: Clientes

### `customers`

Registro de clientes — pode existir sem conta no sistema (atendimento balcão).

| Coluna | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `user_id` | uuid | NULL | — | FK → users.id (SET NULL) |
| `name` | varchar(255) | NOT NULL | — | |
| `email` | varchar(255) | NULL | — | |
| `phone` | varchar(20) | NULL | — | |
| `whatsapp` | varchar(20) | NULL | — | |
| `document` | varchar(20) | NULL | — | CPF ou CNPJ |
| `document_type` | document_type | NULL | — | |
| `birth_date` | text | NULL | — | ISO string (flexível) |
| `notes` | text | NULL | — | Observações internas |
| `is_active` | boolean | NOT NULL | `true` | |
| `created_at` | timestamptz | NOT NULL | now() | |
| `updated_at` | timestamptz | NOT NULL | now() | |

### `addresses`

Endereços de entrega dos clientes (múltiplos por cliente).

| Coluna | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `customer_id` | uuid | NOT NULL | — | FK → customers.id (CASCADE) |
| `label` | varchar(100) | NULL | — | Ex: "Casa", "Trabalho" |
| `type` | address_type | NOT NULL | `residential` | |
| `zip_code` | varchar(10) | NOT NULL | — | CEP |
| `street` | varchar(255) | NOT NULL | — | Rua/Avenida |
| `number` | varchar(20) | NOT NULL | — | Número |
| `complement` | varchar(100) | NULL | — | Apto, bloco, etc. |
| `neighborhood` | varchar(100) | NOT NULL | — | Bairro |
| `city` | varchar(100) | NOT NULL | — | Cidade |
| `state` | varchar(2) | NOT NULL | — | UF (ex: SP) |
| `country` | varchar(2) | NOT NULL | `BR` | |
| `is_default` | boolean | NOT NULL | `false` | Endereço padrão? |
| `created_at` | timestamptz | NOT NULL | now() | |
| `updated_at` | timestamptz | NOT NULL | now() | |

**Relacionamentos:**
- `customers` → `addresses` : 1:N (cascade delete)
- `customers.user_id` → `users.id` : N:1 (nullable, SET NULL)

---

## Módulo: Catálogo

### `brands`

Marcas de produtos (Apple, Samsung, Motorola, etc.).

| Coluna | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `name` | varchar(100) | NOT NULL | — | UNIQUE |
| `slug` | varchar(100) | NOT NULL | — | UNIQUE |
| `logo_url` | text | NULL | — | |
| `is_active` | boolean | NOT NULL | `true` | |
| `created_at` | timestamptz | NOT NULL | now() | |
| `updated_at` | timestamptz | NOT NULL | now() | |

### `categories`

Categorias com hierarquia (ex: Celulares > Smartphones > Android).

| Coluna | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `parent_id` | uuid | NULL | — | FK → categories.id (self-ref, SET NULL) |
| `name` | varchar(100) | NOT NULL | — | |
| `slug` | varchar(100) | NOT NULL | — | UNIQUE |
| `description` | text | NULL | — | |
| `image_url` | text | NULL | — | |
| `is_active` | boolean | NOT NULL | `true` | |
| `sort_order` | integer | NOT NULL | `0` | Ordem de exibição |
| `created_at` | timestamptz | NOT NULL | now() | |
| `updated_at` | timestamptz | NOT NULL | now() | |

### `products`

Produtos do catálogo (celulares, capas, peças, serviços).

| Coluna | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `brand_id` | uuid | NULL | — | FK → brands.id (SET NULL) |
| `category_id` | uuid | NULL | — | FK → categories.id (SET NULL) |
| `name` | varchar(255) | NOT NULL | — | |
| `slug` | varchar(255) | NOT NULL | — | UNIQUE |
| `sku` | varchar(100) | NULL | — | UNIQUE |
| `barcode` | varchar(50) | NULL | — | EAN-13, UPC |
| `description` | text | NULL | — | Descrição longa |
| `short_description` | text | NULL | — | Descrição curta |
| `cost_price` | numeric(12,2) | NULL | — | Preço de custo |
| `sell_price` | numeric(12,2) | NOT NULL | — | Preço de venda |
| `sale_price` | numeric(12,2) | NULL | — | Preço promocional |
| `weight` | numeric(8,3) | NULL | — | Peso em kg |
| `height_cm` | numeric(8,2) | NULL | — | |
| `width_cm` | numeric(8,2) | NULL | — | |
| `depth_cm` | numeric(8,2) | NULL | — | |
| `is_active` | boolean | NOT NULL | `true` | |
| `is_featured` | boolean | NOT NULL | `false` | Produto em destaque? |
| `is_service` | boolean | NOT NULL | `false` | É serviço (não físico)? |
| `created_at` | timestamptz | NOT NULL | now() | |
| `updated_at` | timestamptz | NOT NULL | now() | |

### `product_images`

Imagens dos produtos (múltiplas por produto, com ordem).

| Coluna | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `product_id` | uuid | NOT NULL | — | FK → products.id (CASCADE) |
| `url` | text | NOT NULL | — | |
| `alt_text` | varchar(255) | NULL | — | |
| `sort_order` | integer | NOT NULL | `0` | |
| `is_primary` | boolean | NOT NULL | `false` | Imagem principal? |
| `created_at` | timestamptz | NOT NULL | now() | |

---

## Módulo: Estoque

### `suppliers`

Fornecedores de produtos e peças.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `name` | varchar(255) | NOT NULL | |
| `contact_name` | varchar(255) | NULL | Nome do contato |
| `email` | varchar(255) | NULL | |
| `phone` | varchar(20) | NULL | |
| `whatsapp` | varchar(20) | NULL | |
| `document` | varchar(20) | NULL | CNPJ |
| `address` | text | NULL | |
| `notes` | text | NULL | |
| `is_active` | boolean | NOT NULL | |
| `created_at` | timestamptz | NOT NULL | |
| `updated_at` | timestamptz | NOT NULL | |

### `stock`

Saldo de estoque por produto (1:1 com products).

| Coluna | Tipo | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | gen_random_uuid() | PK |
| `product_id` | uuid | NOT NULL | — | FK → products.id (CASCADE, UNIQUE) |
| `quantity` | integer | NOT NULL | `0` | Quantidade atual |
| `min_quantity` | integer | NOT NULL | `0` | Estoque mínimo (alerta) |
| `max_quantity` | integer | NULL | — | Estoque máximo |
| `location` | varchar(100) | NULL | — | Localização física |
| `updated_at` | timestamptz | NOT NULL | now() | |

### `stock_movements`

Histórico de todas as movimentações de estoque.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `product_id` | uuid | NOT NULL | FK → products.id (RESTRICT) |
| `supplier_id` | uuid | NULL | FK → suppliers.id (SET NULL) |
| `user_id` | uuid | NULL | FK → users.id (SET NULL) — quem registrou |
| `type` | stock_movement_type | NOT NULL | Tipo da movimentação |
| `quantity` | integer | NOT NULL | Quantidade movimentada |
| `previous_quantity` | integer | NOT NULL | Saldo antes |
| `new_quantity` | integer | NOT NULL | Saldo depois |
| `unit_cost` | numeric(12,2) | NULL | Custo unitário |
| `reference` | varchar(100) | NULL | NF, OS, número do pedido |
| `notes` | text | NULL | |
| `created_at` | timestamptz | NOT NULL | |

---

## Módulo: Ordens de Serviço

### `technicians`

Técnicos vinculados a um usuário do sistema.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `user_id` | uuid | NOT NULL | FK → users.id (RESTRICT, UNIQUE) |
| `specialties` | text[] | NULL | Ex: `['smartphone', 'tablet']` |
| `is_active` | boolean | NOT NULL | |
| `created_at` | timestamptz | NOT NULL | |
| `updated_at` | timestamptz | NOT NULL | |

### `defects`

Catálogo de defeitos possíveis por tipo de dispositivo.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `name` | varchar(255) | NOT NULL | Ex: "Tela trincada" |
| `description` | text | NULL | |
| `device_type` | device_type | NULL | Tipo de dispositivo |
| `is_active` | boolean | NOT NULL | |
| `created_at` | timestamptz | NOT NULL | |

### `services_catalog`

Catálogo de serviços prestados com preço e tempo estimado.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `name` | varchar(255) | NOT NULL | Ex: "Troca de tela iPhone 14" |
| `description` | text | NULL | |
| `price` | numeric(12,2) | NOT NULL | |
| `estimated_minutes` | integer | NULL | Tempo estimado |
| `device_type` | device_type | NULL | |
| `is_active` | boolean | NOT NULL | |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

### `service_orders`

Ordem de serviço principal.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `number` | varchar(20) | NOT NULL | UNIQUE — Ex: OS-2024-0001 |
| `customer_id` | uuid | NOT NULL | FK → customers.id (RESTRICT) |
| `technician_id` | uuid | NULL | FK → technicians.id (SET NULL) |
| `status` | service_order_status | NOT NULL | `received` padrão |
| `device_type` | device_type | NOT NULL | |
| `device_brand` | varchar(100) | NOT NULL | |
| `device_model` | varchar(100) | NOT NULL | |
| `device_color` | varchar(50) | NULL | |
| `device_imei` | varchar(20) | NULL | IMEI principal |
| `device_imei2` | varchar(20) | NULL | IMEI secundário |
| `device_serial` | varchar(100) | NULL | |
| `device_password` | varchar(100) | NULL | Senha de desbloqueio |
| `estimated_value` | numeric(12,2) | NULL | Orçamento estimado |
| `final_value` | numeric(12,2) | NULL | Valor final cobrado |
| `discount` | numeric(12,2) | NOT NULL | `0` padrão |
| `received_at` | timestamptz | NOT NULL | |
| `estimated_completion_at` | timestamptz | NULL | Prazo estimado |
| `completed_at` | timestamptz | NULL | |
| `delivered_at` | timestamptz | NULL | |
| `customer_complaint` | text | NULL | Reclamação do cliente |
| `internal_notes` | text | NULL | |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

### `diagnoses`

Diagnósticos registrados na OS (pode ter múltiplos defeitos).

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `service_order_id` | uuid | NOT NULL | FK → service_orders.id (CASCADE) |
| `defect_id` | uuid | NULL | FK → defects.id (SET NULL) |
| `technician_id` | uuid | NULL | FK → technicians.id (SET NULL) |
| `description` | text | NOT NULL | |
| `approved_by_customer` | boolean | NOT NULL | |
| `created_at` | timestamptz | NOT NULL | |

### `services_performed`

Serviços executados na OS (referência ao catálogo de serviços).

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `service_order_id` | uuid | NOT NULL | FK → service_orders.id (CASCADE) |
| `service_catalog_id` | uuid | NULL | FK → services_catalog.id (SET NULL) |
| `technician_id` | uuid | NULL | FK → technicians.id (SET NULL) |
| `service_name` | varchar(255) | NOT NULL | Snapshot do nome |
| `price` | numeric(12,2) | NOT NULL | Snapshot do preço |
| `discount` | numeric(12,2) | NOT NULL | |
| `notes` | text | NULL | |
| `performed_at` | timestamptz | NOT NULL | |

### `parts_used`

Peças/produtos utilizados na OS.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `service_order_id` | uuid | NOT NULL | FK → service_orders.id (CASCADE) |
| `product_id` | uuid | NULL | FK → products.id (SET NULL) |
| `product_name` | varchar(255) | NOT NULL | Snapshot |
| `quantity` | integer | NOT NULL | |
| `unit_cost` | numeric(12,2) | NOT NULL | |
| `unit_price` | numeric(12,2) | NOT NULL | |
| `created_at` | timestamptz | NOT NULL | |

### `service_order_history`

Log de mudanças de status da OS.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `service_order_id` | uuid | NOT NULL | FK → service_orders.id (CASCADE) |
| `user_id` | uuid | NULL | FK → users.id (SET NULL) |
| `status` | service_order_status | NOT NULL | Novo status |
| `notes` | text | NULL | |
| `created_at` | timestamptz | NOT NULL | |

### `entry_checklist`

Checklist de recebimento do aparelho.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `service_order_id` | uuid | NOT NULL | FK → service_orders.id (CASCADE, UNIQUE) |
| `screen_condition` | varchar(100) | NULL | Condição da tela |
| `back_cover_condition` | varchar(100) | NULL | Condição da tampa |
| `battery_condition` | varchar(100) | NULL | Condição da bateria |
| `buttons_working` | boolean | NULL | Botões funcionando? |
| `speaker_working` | boolean | NULL | Alto-falante? |
| `microphone_working` | boolean | NULL | Microfone? |
| `camera_working` | boolean | NULL | Câmera? |
| `charging_port_working` | boolean | NULL | Porta de carregamento? |
| `sim_card_present` | boolean | NULL | Chip presente? |
| `accessories` | text[] | NULL | Acessórios recebidos |
| `observations` | text | NULL | |
| `checked_at` | timestamptz | NOT NULL | |

### `exit_checklist`

Checklist de entrega do aparelho após o serviço.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `service_order_id` | uuid | NOT NULL | FK → service_orders.id (CASCADE, UNIQUE) |
| `all_services_done` | boolean | NOT NULL | |
| `device_clean` | boolean | NOT NULL | Aparelho limpo? |
| `customer_signature` | text | NULL | Assinatura digital (base64) |
| `customer_notified_at` | timestamptz | NULL | |
| `observations` | text | NULL | |
| `checked_at` | timestamptz | NOT NULL | |

---

## Módulo: Garantias

### `warranties`

Garantias associadas a produtos vendidos ou serviços realizados.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `type` | warranty_type | NOT NULL | `manufacturer`, `store`, `service` |
| `product_id` | uuid | NULL | FK → products.id (SET NULL) |
| `service_order_id` | uuid | NULL | FK → service_orders.id (SET NULL) |
| `customer_id` | uuid | NOT NULL | FK → customers.id (RESTRICT) |
| `description` | text | NOT NULL | |
| `terms` | text | NULL | Termos da garantia |
| `starts_at` | timestamptz | NOT NULL | |
| `expires_at` | timestamptz | NOT NULL | |
| `is_active` | boolean | NOT NULL | |
| `claimed_at` | timestamptz | NULL | Data de acionamento |
| `claim_notes` | text | NULL | |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

---

## Módulo: Comércio

### `coupons`

Cupons de desconto (percentual ou valor fixo).

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `code` | varchar(50) | NOT NULL | UNIQUE |
| `description` | text | NULL | |
| `type` | coupon_type | NOT NULL | `percentage` ou `fixed` |
| `value` | numeric(12,2) | NOT NULL | % ou R$ |
| `min_order_value` | numeric(12,2) | NULL | Pedido mínimo |
| `max_discount` | numeric(12,2) | NULL | Desconto máximo (para %) |
| `usage_limit` | integer | NULL | Total de usos |
| `usage_count` | integer | NOT NULL | Usos realizados |
| `usage_limit_per_user` | integer | NULL | `1` padrão |
| `is_active` | boolean | NOT NULL | |
| `starts_at` | timestamptz | NULL | |
| `expires_at` | timestamptz | NULL | |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

### `orders`

Pedidos de venda.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `number` | varchar(20) | NOT NULL | UNIQUE — Ex: PED-2024-0001 |
| `customer_id` | uuid | NOT NULL | FK → customers.id (RESTRICT) |
| `address_id` | uuid | NULL | FK → addresses.id (SET NULL) |
| `coupon_id` | uuid | NULL | FK → coupons.id (SET NULL) |
| `status` | order_status | NOT NULL | `pending` padrão |
| `subtotal` | numeric(12,2) | NOT NULL | |
| `discount_amount` | numeric(12,2) | NOT NULL | `0` padrão |
| `shipping_cost` | numeric(12,2) | NOT NULL | `0` padrão |
| `total` | numeric(12,2) | NOT NULL | |
| `notes` | text | NULL | |
| `tracking_code` | varchar(100) | NULL | Código de rastreio |
| `shipped_at` | timestamptz | NULL | |
| `delivered_at` | timestamptz | NULL | |
| `cancelled_at` | timestamptz | NULL | |
| `cancellation_reason` | text | NULL | |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

### `order_items`

Itens de cada pedido (snapshot do produto no momento da venda).

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `order_id` | uuid | NOT NULL | FK → orders.id (CASCADE) |
| `product_id` | uuid | NULL | FK → products.id (SET NULL) |
| `product_name` | varchar(255) | NOT NULL | Snapshot |
| `product_sku` | varchar(100) | NULL | Snapshot |
| `quantity` | integer | NOT NULL | |
| `unit_price` | numeric(12,2) | NOT NULL | Snapshot |
| `discount` | numeric(12,2) | NOT NULL | |
| `total` | numeric(12,2) | NOT NULL | |
| `created_at` | timestamptz | NOT NULL | |

### `carts`

Carrinhos de compra (sessão de compra).

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `customer_id` | uuid | NULL | FK → customers.id (SET NULL) |
| `session_id` | varchar(255) | NULL | Para carrinhos anônimos |
| `expires_at` | timestamptz | NULL | |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

### `cart_items`

Itens no carrinho.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `cart_id` | uuid | NOT NULL | FK → carts.id (CASCADE) |
| `product_id` | uuid | NOT NULL | FK → products.id (CASCADE) |
| `quantity` | integer | NOT NULL | |
| `created_at` | timestamptz | NOT NULL | |

### `favorites`

Lista de produtos favoritos dos clientes.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `customer_id` | uuid | NOT NULL | FK → customers.id (CASCADE) |
| `product_id` | uuid | NOT NULL | FK → products.id (CASCADE) |
| `created_at` | timestamptz | NOT NULL | |

---

## Módulo: Pagamentos

### `payment_history`

Histórico de pagamentos (pedidos e ordens de serviço).

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `order_id` | uuid | NULL | FK → orders.id (SET NULL) |
| `service_order_id` | uuid | NULL | FK → service_orders.id (SET NULL) |
| `method` | payment_method | NOT NULL | |
| `status` | payment_status | NOT NULL | `pending` padrão |
| `amount` | numeric(12,2) | NOT NULL | |
| `gateway` | varchar(100) | NULL | Ex: "mercadopago", "pagseguro" |
| `gateway_transaction_id` | varchar(255) | NULL | ID externo |
| `gateway_response` | jsonb | NULL | Resposta completa do gateway |
| `installments` | integer | NULL | Parcelas (cartão) |
| `paid_at` | timestamptz | NULL | |
| `refunded_at` | timestamptz | NULL | |
| `refund_reason` | text | NULL | |
| `notes` | text | NULL | |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

---

## Módulo: Loja

### `banners`

Banners promocionais com posicionamento configurável.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `title` | varchar(255) | NOT NULL | |
| `subtitle` | text | NULL | |
| `image_url` | text | NOT NULL | |
| `link_url` | text | NULL | Link de destino |
| `position` | banner_position | NOT NULL | Onde exibir |
| `sort_order` | integer | NOT NULL | |
| `is_active` | boolean | NOT NULL | |
| `starts_at` | timestamptz | NULL | |
| `expires_at` | timestamptz | NULL | |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

### `store_settings`

Configurações globais da loja (uma linha só).

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `store_name` | varchar(255) | NOT NULL | `Flash Cell Store` padrão |
| `store_document` | varchar(20) | NULL | CNPJ |
| `store_email` | varchar(255) | NULL | |
| `store_phone` | varchar(20) | NULL | |
| `store_whatsapp` | varchar(20) | NULL | |
| `store_address` | jsonb | NULL | Endereço completo |
| `logo_url` | text | NULL | |
| `favicon_url` | text | NULL | |
| `primary_color` | varchar(7) | NULL | `#000000` padrão |
| `meta_title` | varchar(255) | NULL | SEO |
| `meta_description` | text | NULL | SEO |
| `maintenance_mode` | boolean | NOT NULL | `false` padrão |
| `allow_guest_checkout` | boolean | NOT NULL | `true` padrão |
| `extra` | jsonb | NULL | Configurações extras flexíveis |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

---

## Módulo: Logs

### `system_logs`

Auditoria de ações do sistema.

| Coluna | Tipo | Nulo | Descrição |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `user_id` | uuid | NULL | FK → users.id (SET NULL) |
| `level` | log_level | NOT NULL | `info` padrão |
| `action` | varchar(100) | NOT NULL | Ex: `user.login`, `order.created` |
| `entity` | varchar(100) | NULL | Ex: `user`, `order` |
| `entity_id` | uuid | NULL | ID da entidade afetada |
| `message` | text | NOT NULL | |
| `metadata` | jsonb | NULL | Payload, before/after |
| `ip_address` | inet | NULL | |
| `user_agent` | text | NULL | |
| `created_at` | timestamptz | NOT NULL | |

---

## Diagrama de relacionamentos (resumido)

```
users ──────────── profiles (1:1)
  │
  └── customers (N:1, nullable)
        └── addresses (1:N)
        └── orders (1:N) ──── order_items (1:N) ──── products
        └── carts (1:N) ───── cart_items (1:N) ───── products
        └── favorites (1:N) ─ products
        └── service_orders (1:N)
              ├── diagnoses (1:N) ──── defects
              ├── services_performed (1:N) ── services_catalog
              ├── parts_used (1:N) ──────────── products
              ├── service_order_history (1:N)
              ├── entry_checklist (1:1)
              └── exit_checklist (1:1)

products ──── brands
         ──── categories (self-ref hierárquico)
         └─── product_images (1:N)
         └─── stock (1:1)
         └─── stock_movements (1:N) ── suppliers

orders ──── payment_history (1:N)
service_orders ── payment_history (1:N)

warranties ── products (nullable)
           ── service_orders (nullable)
           ── customers
```

---

## Comandos úteis

```bash
# Gerar nova migration após alterar um schema
pnpm db:generate

# Aplicar migrations pendentes
pnpm db:migrate

# Inspecionar banco graficamente
pnpm db:studio

# Popular dados iniciais
pnpm --filter @flash-cell/backend run db:seed
```
