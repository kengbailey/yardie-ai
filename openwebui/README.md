# OpenWebUI Instance Configuration

Each OpenWebUI instance requires the following environment variables. These are set in the docker-compose service definition for each instance.

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_BASE_URLS` | LiteLLM proxy URL. All LLM requests route through this proxy. | `http://litellm:4000/v1` |
| `OPENAI_API_KEYS` | Instance-specific LiteLLM API key. Each instance has a unique key for attribution and per-instance budgeting. | `sk-cornwall-instance-key` |
| `ENABLE_SIGNUP` | Must be `false`. User accounts are created only via the admin API through the provisioning pipeline. | `false` |
| `DATABASE_URL` | Instance-specific PostgreSQL connection string. Each instance has its own database for data isolation. | `postgresql://postgres:pass@postgres:5432/openwebui_cornwall_db` |
| `WEBUI_SECRET_KEY` | Unique secret key for session signing. Generate with `openssl rand -base64 32`. Must be unique per instance. | `<random-base64-string>` |
| `ENABLE_MODEL_FILTER` | Whether to restrict visible models. Set to `true` for production instances. | `true` |
| `MODEL_FILTER_LIST` | Semicolon-separated list of model IDs visible to users. Only applies when `ENABLE_MODEL_FILTER=true`. | `openai/gpt-4o;anthropic/claude-3.5-sonnet` |
| `WEBUI_URL` | Public URL of this OpenWebUI instance. Used for generating links. | `https://cornwall.yardie.ai` |
| `WEBUI_NAME` | Display name shown in the OpenWebUI interface. | `Cornwall AI` |
| `DEFAULT_USER_ROLE` | Default role for newly created users. Set to `pending` so admins must approve. | `pending` |

## Example docker-compose Service

```yaml
openwebui-cornwall:
  image: ghcr.io/open-webui/open-webui:main
  container_name: yardie-openwebui-cornwall
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.openwebui-cornwall.rule=Host(`cornwall.yardie.ai`)"
    - "traefik.http.routers.openwebui-cornwall.entrypoints=web"
    - "traefik.http.services.openwebui-cornwall.loadbalancer.server.port=8080"
  environment:
    - OPENAI_API_BASE_URLS=http://litellm:4000/v1
    - OPENAI_API_KEYS=${OPENWEBUI_CORNWALL_API_KEY}
    - ENABLE_SIGNUP=false
    - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/openwebui_cornwall_db
    - WEBUI_SECRET_KEY=${OPENWEBUI_CORNWALL_SECRET}
    - ENABLE_MODEL_FILTER=true
    - MODEL_FILTER_LIST=openai/gpt-4o;anthropic/claude-3.5-sonnet;meta-llama/llama-3.1-70b-instruct
    - WEBUI_URL=https://cornwall.yardie.ai
    - WEBUI_NAME=Cornwall AI
    - DEFAULT_USER_ROLE=pending
  depends_on:
    postgres:
      condition: service_healthy
    litellm:
      condition: service_healthy
  networks:
    - yardie-network
  restart: unless-stopped
```

## User Attribution Function

Each instance must have the user-attribution filter function deployed. This function injects user identity metadata into LLM requests so LiteLLM can attribute usage correctly.

Deploy the function automatically:

```bash
npm run deploy:function -- --url <instance-url> --key <admin-api-key>
```

See `openwebui/user-attribution-function.py` for the function source code.

## Notes

- Self-registration is disabled (`ENABLE_SIGNUP=false`). Users are created via the provisioning pipeline when assigned to an instance by a sysadmin or manager.
- Each instance has its own PostgreSQL database for data isolation between instances.
- The `OPENAI_API_KEYS` value is a LiteLLM virtual key specific to the instance, not the OpenRouter API key.
- Pin all instances to the same OpenWebUI image tag for version consistency.
