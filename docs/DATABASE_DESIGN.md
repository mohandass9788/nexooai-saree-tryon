# Database Design — NeXooAi Virtual Saree Try-On

## 1. Relational Schema Overview

The database design uses normalized PostgreSQL entities (with SQLite compatibility for rapid local development).

```mermaid
erDiagram
    SHOPS ||--o{ BRANCHES : has
    BRANCHES ||--o{ KIOSKS : contains
    SHOPS ||--o{ CATEGORIES : defines
    CATEGORIES ||--o{ PRODUCTS : categorizes
    PRODUCTS ||--o{ PRODUCT_IMAGES : contains
    KIOSKS ||--o{ TRYON_SESSIONS : records
    TRYON_SESSIONS ||--o{ TRYON_JOBS : executes
    TRYON_JOBS ||--o| DOWNLOAD_TOKENS : generates
    ADMIN_USERS ||--o{ AUDIT_LOGS : performs

    SHOPS {
        uuid id PK
        string name
        string slug
        timestamp created_at
    }

    BRANCHES {
        uuid id PK
        uuid shop_id FK
        string branch_name
        string city
        string address
    }

    KIOSKS {
        uuid id PK
        uuid branch_id FK
        string kiosk_code
        string display_name
        string status
        timestamp last_ping_at
    }

    CATEGORIES {
        uuid id PK
        uuid shop_id FK
        string name
        string slug
        string display_order
    }

    PRODUCTS {
        uuid id PK
        uuid category_id FK
        string sku
        string name
        string color
        string fabric
        numeric price
        string pallu_type
        boolean is_active
        timestamp created_at
    }

    PRODUCT_IMAGES {
        uuid id PK
        uuid product_id FK
        string image_url
        boolean is_primary
        string suitability_status
    }

    TRYON_SESSIONS {
        uuid id PK
        uuid kiosk_id FK
        string language
        boolean consent_accepted
        timestamp started_at
        timestamp ended_at
    }

    TRYON_JOBS {
        uuid id PK
        uuid session_id FK
        uuid product_id FK
        string provider_name
        string provider_job_id
        string status
        integer processing_time_ms
        numeric estimated_cost
        string result_image_url
        string error_code
        timestamp created_at
        timestamp expires_at
    }

    DOWNLOAD_TOKENS {
        uuid id PK
        uuid job_id FK
        string token_hash
        timestamp expires_at
        integer download_count
        integer max_downloads
    }

    ADMIN_USERS {
        uuid id PK
        string email
        string hashed_password
        string role
        boolean is_active
    }

    AUDIT_LOGS {
        uuid id PK
        uuid admin_user_id FK
        string action
        string entity_type
        string entity_id
        timestamp created_at
    }
```

## 2. Retention & Privacy Constraints
- Customer input photos and intermediate representations are marked with an `expires_at` timestamp (default: 24 hours, configurable via `MEDIA_RETENTION_HOURS`).
- Download tokens expire after 30 minutes (`DOWNLOAD_TOKEN_EXPIRY_MINUTES`).
- A background cron/retention worker deletes customer images from storage once their session expires.
