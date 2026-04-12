# LLM API Proxy/Gateway Research Spike

> **Date**: 2026-04-08
> **Context**: yardie.ai platform -- managed OpenWebUI instances requiring centralized LLM API proxy/gateway
> **Research scope**: Existing solutions, OpenRouter integration, token counting, OpenTelemetry, build-vs-buy, architecture patterns

---

## Key Findings

1. **LiteLLM Proxy is the strongest existing fit.** It provides OpenAI-compatible proxy with built-in per-user/per-team budgets, model access controls, usage tracking, streaming support, and OpenRouter compatibility out of the box. It is the most feature-complete option for our exact requirements.

2. **No single off-the-shelf solution covers 100% of our needs.** Per-user budget enforcement tied to a custom subscription tier system, integration with our specific tenant model (managed OpenWebUI instances), and real-time quota blocking all require custom business logic regardless of the foundation chosen.

3. **Token counting on streaming responses is a solved problem** -- but only "after the fact." Pre-request budget estimation is inherently approximate. The recommended approach is a hybrid: pre-check estimated cost, allow the stream, then reconcile actual usage from the provider's response metadata or from OpenRouter's usage reporting.

4. **OpenRouter simplifies model routing significantly.** It provides a unified API across 200+ models, includes usage metadata in responses (even streaming), and reports cost per request. This eliminates the need for our proxy to maintain model-specific pricing tables.

5. **OpenTelemetry GenAI semantic conventions are maturing rapidly.** The `gen_ai.*` attribute namespace is now well-defined, and libraries like OpenLLMetry (Traceloop) and OpenLIT provide auto-instrumentation. GCP export paths (Cloud Trace, Cloud Monitoring, BigQuery) are well-supported.

6. **Recommended path: LiteLLM Proxy as foundation + custom middleware for yardie.ai business logic.** This avoids building streaming proxy infrastructure from scratch while giving us full control over the billing/access logic that differentiates our platform.

---

## 1. Existing LLM Gateway/Proxy Solutions

### Detailed Solution Analysis

#### 1.1 LiteLLM Proxy

- **Repository**: https://github.com/BerriAI/litellm
- **Documentation**: https://docs.litellm.ai/
- **License**: MIT (Enterprise features available under commercial license)
- **Language**: Python (FastAPI)
- **Maturity**: Very high. 15k+ GitHub stars. Active daily development. Used in production by numerous companies.

**What it does**:
LiteLLM Proxy is an OpenAI-compatible API proxy server that sits between clients and 100+ LLM providers. It translates all requests into a unified OpenAI-compatible format and routes them to the configured provider.

**Key features relevant to yardie.ai**:

| Feature | Support | Details |
|---------|---------|---------|
| OpenAI-compatible API | Yes | Drop-in replacement for OpenAI base URL |
| OpenRouter support | Yes | First-class provider, configure with `openrouter/` prefix |
| Per-user budgets | Yes | `max_budget` per virtual key, soft and hard limits |
| Per-team budgets | Yes | Team-level budget aggregation |
| Model access control | Yes | Per-key model allowlists via `models` parameter |
| Usage tracking | Yes | PostgreSQL-backed spend tracking, per-key/per-user/per-model |
| Streaming | Yes | Full SSE streaming passthrough with usage extraction |
| Rate limiting | Yes | RPM/TPM limits per key, per user, per model |
| Virtual keys | Yes | Generate API keys mapped to users with individual configs |
| Caching | Yes | Redis-based semantic caching (optional) |
| Callbacks/webhooks | Yes | Custom callback system, supports webhooks for spend alerts |
| Admin UI | Yes | Built-in dashboard for key management and spend tracking |
| Loadbalancing | Yes | Route across multiple provider keys with fallback |
| OpenTelemetry | Yes | Native OTEL export, OTLP endpoint configuration |
| Self-hostable | Yes | Docker image, Helm chart for Kubernetes |

**Budget enforcement details**:
- Virtual keys can have `max_budget` (USD), `max_parallel_requests`, `tpm_limit`, `rpm_limit`
- Budget is checked pre-request and updated post-request
- When budget is exhausted, returns 429 with informative error
- Budget period can be set (daily, weekly, monthly, or total)
- Spend is tracked per-key in PostgreSQL with breakdown by model

**Model access control**:
- Each virtual key can specify an allowlist of models
- Keys without model restrictions can access all configured models
- Models can be aliased (e.g., `gpt-4` maps to `openrouter/openai/gpt-4`)

**Streaming handling**:
- Full SSE passthrough
- Extracts `usage` from the final streaming chunk (most providers include this)
- If provider does not include usage in stream, can fall back to token counting
- Supports `stream_options: {"include_usage": true}` for OpenAI-compatible providers

**Limitations**:
- Python/FastAPI means slightly higher baseline latency than Go/Rust (~5-15ms added)
- Enterprise features (SSO, audit logs, advanced analytics) require paid license
- Database dependency (PostgreSQL) for spend tracking
- Complexity: it is a large codebase with many features, debugging can be non-trivial

**Pricing**:
- Open source (MIT) for core proxy
- Enterprise: custom pricing for SSO, advanced UI, premium support
- Self-hosted: free (you manage infrastructure)

---

#### 1.2 Portkey AI Gateway

- **Repository**: https://github.com/Portkey-ai/gateway
- **Documentation**: https://docs.portkey.ai/
- **License**: MIT (gateway core), hosted service has paid tiers
- **Language**: TypeScript/Node.js (the open-source gateway); Rust for their internal edge
- **Maturity**: High. 6k+ GitHub stars. Actively maintained.

**What it does**:
Portkey provides an AI gateway focused on reliability, observability, and routing. The open-source gateway handles request routing, caching, retries, and loadbalancing. The hosted platform adds a full observability dashboard.

**Key features relevant to yardie.ai**:

| Feature | Support | Details |
|---------|---------|---------|
| OpenAI-compatible API | Yes | Compatible request/response format |
| OpenRouter support | Yes | Via custom provider configuration |
| Per-user budgets | Partial | Available on hosted platform, not in OSS gateway |
| Model access control | Partial | Via routing config, not per-user ACLs in OSS |
| Usage tracking | Hosted only | Full analytics on hosted platform |
| Streaming | Yes | Full streaming passthrough |
| Rate limiting | Hosted only | Not in OSS gateway core |
| Caching | Yes | Semantic caching built into gateway |
| Fallback/retry | Yes | Automatic fallback chains, retry with backoff |
| Loadbalancing | Yes | Weighted routing across providers |
| Self-hostable | Partial | Gateway core yes; analytics/dashboard requires hosted |

**Limitations for yardie.ai**:
- The open-source gateway is primarily a routing/reliability layer
- Budget enforcement, usage tracking, and per-user controls require the hosted platform or building custom middleware
- Less mature than LiteLLM for the specific proxy-with-budgets use case

**Pricing**:
- OSS gateway: free (MIT)
- Hosted: free tier (10k requests/mo), Pro ($49/mo), Enterprise (custom)

---

#### 1.3 Helicone

- **Repository**: https://github.com/Helicone/helicone
- **Documentation**: https://docs.helicone.ai/
- **License**: Apache 2.0
- **Language**: TypeScript/Next.js (dashboard), Rust (edge worker for proxy)
- **Maturity**: High. 5k+ GitHub stars. Production-proven at scale.

**What it does**:
Helicone is primarily an LLM observability and monitoring platform. It works as a proxy that logs all LLM requests and provides analytics dashboards, cost tracking, and usage insights.

**Key features relevant to yardie.ai**:

| Feature | Support | Details |
|---------|---------|---------|
| OpenAI-compatible API | Yes | Change base URL to Helicone's proxy |
| OpenRouter support | Yes | Via proxy pass-through configuration |
| Per-user budgets | No | Observability only, does not block requests |
| Model access control | No | Passthrough proxy, no access control |
| Usage tracking | Yes | Excellent -- per-user, per-model, per-session analytics |
| Streaming | Yes | Full streaming with usage extraction |
| Rate limiting | Partial | Rate limiting available, not budget-based |
| Cost tracking | Yes | Detailed cost breakdown by user, model, time |
| Caching | Yes | Response caching to reduce costs |
| Self-hostable | Yes | Docker-based self-hosting |
| Alerting | Yes | Cost and usage alerts |

**Limitations for yardie.ai**:
- **Does not enforce budgets** -- it is an observability tool, not a gatekeeper
- No model access control
- Would need to be combined with a budget-enforcement layer
- Could serve as the observability/analytics layer alongside another solution

**Pricing**:
- OSS: free (self-hosted)
- Cloud: free tier (100k requests/mo), Pro ($20/mo per seat), Enterprise (custom)

---

#### 1.4 MLflow AI Gateway (formerly MLflow Gateway)

- **Repository**: Part of https://github.com/mlflow/mlflow
- **Documentation**: https://mlflow.org/docs/latest/llms/gateway/
- **License**: Apache 2.0
- **Language**: Python
- **Maturity**: Moderate. Part of the MLflow ecosystem (very mature), but AI Gateway is a newer component.

**What it does**:
MLflow AI Gateway provides a centralized API gateway for LLM providers with route configuration, credential management, and unified API access. It is oriented toward ML engineering teams managing model access.

**Key features relevant to yardie.ai**:

| Feature | Support | Details |
|---------|---------|---------|
| OpenAI-compatible API | Partial | Has its own API format, but adapters available |
| OpenRouter support | No | Not a first-class provider; would need custom route |
| Per-user budgets | No | No budget management |
| Model access control | Partial | Route-level access, not per-user |
| Usage tracking | Minimal | Basic request logging |
| Streaming | Yes | Streaming supported |
| Rate limiting | No | Not built-in |
| Self-hostable | Yes | Part of MLflow deployment |

**Limitations for yardie.ai**:
- Designed for ML teams, not multi-tenant SaaS
- No budget or quota management
- No OpenRouter integration
- Adds MLflow as a dependency (heavy if not already using it)
- **Not a good fit for our use case**

---

#### 1.5 Kong AI Gateway

- **Documentation**: https://docs.konghq.com/gateway/latest/ai-gateway/
- **License**: Kong Gateway OSS is Apache 2.0; AI Gateway features require Kong Enterprise
- **Language**: Lua/OpenResty (Kong core), Go plugins
- **Maturity**: Very high as an API gateway. AI features are newer (2024+).

**What it does**:
Kong's AI Gateway is a plugin suite for Kong Gateway that adds LLM-specific features: request transformation, rate limiting, prompt engineering, and multi-provider routing.

**Key features relevant to yardie.ai**:

| Feature | Support | Details |
|---------|---------|---------|
| OpenAI-compatible API | Yes | Via ai-proxy plugin |
| OpenRouter support | Partial | Via generic HTTP upstream, not first-class |
| Per-user budgets | No | Rate limiting yes, budget tracking no |
| Model access control | Partial | Via Kong ACLs and routing |
| Usage tracking | Enterprise | Kong Vitals for analytics |
| Streaming | Yes | Full streaming support |
| Rate limiting | Yes | Powerful rate limiting (Kong core strength) |
| Caching | Yes | Via Kong caching plugins |
| Self-hostable | Yes | Docker, Kubernetes (Helm) |

**Limitations for yardie.ai**:
- AI features require Kong Enterprise ($$)
- Significant operational complexity (requires PostgreSQL/Cassandra for Kong itself)
- No token-level budget management
- Over-engineered for our use case unless we already use Kong
- **Not recommended unless Kong is already in the stack**

---

#### 1.6 Cloudflare AI Gateway

- **Documentation**: https://developers.cloudflare.com/ai-gateway/
- **License**: Proprietary (Cloudflare service)
- **Language**: N/A (managed service)
- **Maturity**: High. GA since late 2024. Backed by Cloudflare infrastructure.

**What it does**:
Cloudflare AI Gateway is a managed proxy service that sits between your application and LLM providers. It provides caching, rate limiting, analytics, and logging.

**Key features relevant to yardie.ai**:

| Feature | Support | Details |
|---------|---------|---------|
| OpenAI-compatible API | Yes | Compatible with OpenAI SDK |
| OpenRouter support | Yes | Via Universal endpoint |
| Per-user budgets | No | No per-user budget management |
| Model access control | No | No model-level ACLs |
| Usage tracking | Yes | Dashboard analytics, cost tracking |
| Streaming | Yes | Full streaming support |
| Rate limiting | Yes | Configurable rate limits |
| Caching | Yes | Response caching with configurable TTL |
| Self-hostable | No | Cloudflare managed service only |
| Logging | Yes | Request/response logging for debugging |

**Limitations for yardie.ai**:
- **Not self-hostable** -- vendor lock-in to Cloudflare
- No per-user budgets or model access control
- Limited customization for multi-tenant scenarios
- No webhook/callback system for budget alerts
- Useful as a caching/analytics layer but not as the primary control plane

**Pricing**:
- Free tier: 100k requests/day (generous)
- Paid: $0.00 currently (included with Workers plan), but subject to change

---

#### 1.7 Other Notable Solutions

**Martian Model Router** (https://github.com/withmartian/router):
- Intelligent model routing based on cost/quality tradeoffs
- No budget enforcement. Useful for cost optimization, not access control.

**OpenLIT** (https://github.com/openlit/openlit):
- LLM observability platform with OpenTelemetry native instrumentation
- Not a proxy/gateway -- it instruments your code
- Excellent for the observability layer alongside a proxy

**Langfuse** (https://github.com/langfuse/langfuse):
- LLM observability and analytics platform
- Tracing, prompt management, evaluation
- Not a proxy, but could complement one for analytics
- Self-hostable, open source

**Unkey** (https://github.com/unkey/unkey):
- API key management and rate limiting platform
- Could handle the key issuance and rate limiting aspects
- Not LLM-specific, but could be a building block

---

### Comparison Matrix

| Solution | OpenRouter | Per-User Budget | Model ACL | Usage Tracking | Streaming | Self-Host | OSS | Fit Score |
|----------|-----------|----------------|-----------|----------------|-----------|-----------|-----|-----------|
| **LiteLLM Proxy** | Native | Yes (built-in) | Yes | Yes (PostgreSQL) | Yes | Yes | MIT | **9/10** |
| **Portkey Gateway** | Config | Hosted only | Partial | Hosted only | Yes | Partial | MIT | 5/10 |
| **Helicone** | Yes | No (observe only) | No | Excellent | Yes | Yes | Apache 2.0 | 4/10 |
| **MLflow AI Gateway** | No | No | Partial | Minimal | Yes | Yes | Apache 2.0 | 2/10 |
| **Kong AI Gateway** | Partial | No | Partial | Enterprise | Yes | Yes | Enterprise | 3/10 |
| **Cloudflare AI GW** | Yes | No | No | Yes | Yes | No | Proprietary | 3/10 |
| **Custom Build** | Yes | Yes | Yes | Yes | Yes | Yes | Own | 7/10 |

---

## 2. OpenRouter-Specific Considerations

### 2.1 API Format and Compatibility

OpenRouter exposes an **OpenAI-compatible API** at `https://openrouter.ai/api/v1`. This means:

- **Base URL**: `https://openrouter.ai/api/v1`
- **Authentication**: `Authorization: Bearer <OPENROUTER_API_KEY>`
- **Endpoints**: `/chat/completions`, `/completions`, `/models`
- **Request format**: Identical to OpenAI's Chat Completions API
- **Response format**: Identical to OpenAI's format, with additional metadata

Any OpenAI-compatible proxy (LiteLLM, Portkey, etc.) can route to OpenRouter with minimal configuration.

### 2.2 Model Selection Through a Proxy

OpenRouter uses the `model` field in the request body to select the provider and model:

```json
{
  "model": "openai/gpt-4-turbo",
  "messages": [{"role": "user", "content": "Hello"}]
}
```

Model IDs follow the format `provider/model-name`, e.g.:
- `openai/gpt-4-turbo`
- `anthropic/claude-3.5-sonnet`
- `google/gemini-pro-1.5`
- `meta-llama/llama-3.1-70b-instruct`

With LiteLLM, you prefix with `openrouter/`:
```
model: openrouter/anthropic/claude-3.5-sonnet
```

**For our proxy, model access control means filtering the `model` field in the request body against the user's allowed model list.**

### 2.3 OpenRouter's Own Usage Tracking

OpenRouter provides:
- **Per-request usage in response**: `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`
- **Cost in response headers**: `X-OpenRouter-Cost` header (cost in USD for the request)
- **Streaming usage**: The final chunk in a streaming response includes the `usage` object
- **API endpoint for usage**: `GET /api/v1/auth/key` returns remaining credits
- **Activity endpoint**: `GET /api/v1/activity` returns usage history
- **Generation details**: `GET /api/v1/generation?id=<gen_id>` returns full details

**Important**: OpenRouter includes a `generation` field in responses with an ID. You can query `/api/v1/generation?id=<id>` to get detailed cost/usage after the fact.

### 2.4 OpenRouter Pricing Model

OpenRouter uses **per-token pricing** that varies by model:
- Prices are listed per 1M tokens (input and output separately)
- OpenRouter adds a small markup over the provider's direct price
- Some models have free tiers (community models)
- Pricing is available via `GET /api/v1/models` (includes `pricing.prompt` and `pricing.completion` per model)

**Impact on per-user budgeting**:
- We can get real cost from `X-OpenRouter-Cost` response header
- We can also calculate estimated cost pre-request using the model's pricing from the `/models` endpoint
- For budget enforcement, the hybrid approach works: estimate pre-request, reconcile with actual cost post-request

### 2.5 OpenRouter Callbacks/Webhooks

As of early 2025, OpenRouter does **not** provide webhooks for usage events. Usage must be tracked by:
1. Extracting from response headers/body (synchronous)
2. Polling the activity API (asynchronous)
3. Using the generation detail endpoint (asynchronous)

This means our proxy MUST extract usage data from the response (the proxy approach handles this naturally).

### 2.6 OpenRouter Rate Limits

- Rate limits vary by plan (free tier: 20 RPM, 200 RPD; paid: much higher)
- Custom rate limits can be requested for high-volume users
- Rate limit headers are returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- We should monitor these at the proxy level and propagate appropriate errors

---

## 3. Token Counting and Budget Enforcement

### 3.1 Token Counting Methods

**Pre-request estimation (input tokens)**:

| Method | Accuracy | Speed | Models |
|--------|----------|-------|--------|
| `tiktoken` (Python) | Exact for OpenAI models | Fast (~1ms) | GPT-3.5, GPT-4, GPT-4-turbo |
| `tiktoken` (via JS port `js-tiktoken`) | Exact for OpenAI models | Fast | Same as above |
| `@anthropic-ai/tokenizer` | Exact for Claude models | Fast | Claude family |
| Character/word heuristic | ~75% accurate | Instant | Any model |
| OpenRouter's pricing data + avg ratio | ~80% accurate | Instant | Any model |

**Post-request actual count (output tokens)**:

The most reliable method is to use the `usage` object returned by the provider:
```json
{
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 150,
    "total_tokens": 200
  }
}
```

OpenRouter includes this in all responses, including the final chunk of streaming responses.

### 3.2 Token Counting on Streaming Responses (The Hard Problem)

This is the most nuanced challenge. Options:

**Option A: Count from final streaming chunk (RECOMMENDED)**
- Most providers (including OpenRouter) include `usage` in the final `[DONE]`-preceding chunk
- The proxy accumulates streaming chunks, passes them through to the client, and extracts usage from the final chunk
- Pros: Accurate, no tokenizer dependency
- Cons: Usage is only known after the stream completes

**Option B: Count tokens in each chunk as they stream**
- Tokenize each chunk's content as it passes through
- Maintain a running count
- Pros: Real-time tracking
- Cons: Inaccurate (tokenization of fragments differs from tokenization of whole text), model-specific tokenizers needed

**Option C: Post-hoc query to OpenRouter**
- Use the `generation` ID from the response to query `/api/v1/generation?id=<id>`
- Get exact usage and cost after completion
- Pros: Most accurate, includes OpenRouter's actual cost
- Cons: Async, requires additional API call, latency

**Recommended for yardie.ai: Option A (final chunk extraction) as primary, with Option C as reconciliation.**

### 3.3 Budget Enforcement Strategies

**Pre-check (before sending request)**:
```
1. Receive request from OpenWebUI
2. Look up user's remaining budget
3. Estimate max cost: (input_tokens * model_input_price) + (max_output_tokens * model_output_price)
4. If estimated max cost > remaining budget: REJECT with 429
5. Otherwise: forward to OpenRouter
```

- Pros: Prevents overspend
- Cons: Overly conservative (user might have budget for a short response but not max_tokens)

**Post-check (after receiving response)**:
```
1. Forward request to OpenRouter
2. Receive response with actual usage
3. Calculate actual cost
4. Deduct from user's budget
5. If budget now negative: block future requests
```

- Pros: Accurate cost tracking
- Cons: User can overshoot budget on their last request

**Hybrid (RECOMMENDED for yardie.ai)**:
```
1. Receive request
2. Pre-check: is remaining budget > minimum_request_cost (e.g., $0.001)?
   - No: REJECT with 429 and informative error
   - Yes: continue
3. Optionally: set max_tokens in the request to cap output based on remaining budget
4. Forward to OpenRouter
5. Extract actual usage from response
6. Deduct actual cost from budget
7. If budget now < minimum_request_cost: flag user for next-request blocking
```

### 3.4 Handling Budget Exhaustion Mid-Stream

This is a policy decision more than a technical one:

**Option 1: Allow stream to complete, deduct full cost**
- Simplest implementation
- Small overshoot possible (one request's worth)
- Recommended for simplicity

**Option 2: Abort stream if cost exceeds budget**
- Proxy monitors running token count during stream
- When estimated cost exceeds budget, proxy closes the connection
- Client receives a partial response
- Complex to implement, bad user experience

**Option 3: Pre-calculate max output tokens from budget**
- Before forwarding, set `max_tokens` to the maximum the user can afford
- Ensures the full response is within budget
- May truncate responses unexpectedly

**Recommendation: Option 1 with pre-check.** Allow one request to potentially overshoot, but block the next one. The overshoot on a single request is bounded and manageable.

### 3.5 Caching Token Counts

- Cache model pricing data from OpenRouter's `/models` endpoint (refresh hourly)
- Cache per-user budget balances in Redis (write-through to PostgreSQL)
- Use Redis for fast pre-check lookups
- Reconcile Redis with PostgreSQL periodically and on read

---

## 4. OpenTelemetry Integration for LLM Observability

### 4.1 OpenTelemetry GenAI Semantic Conventions

The OpenTelemetry community has defined semantic conventions for Generative AI operations under the `gen_ai.*` namespace. As of early 2025, these are in "experimental" status but widely adopted.

**Key attributes**:

| Attribute | Type | Description |
|-----------|------|-------------|
| `gen_ai.system` | string | The AI system (e.g., `openai`, `anthropic`, `openrouter`) |
| `gen_ai.request.model` | string | Model requested (e.g., `openai/gpt-4-turbo`) |
| `gen_ai.response.model` | string | Model that actually responded |
| `gen_ai.request.max_tokens` | int | Max tokens requested |
| `gen_ai.request.temperature` | float | Temperature parameter |
| `gen_ai.response.finish_reasons` | string[] | Finish reasons (e.g., `["stop"]`) |
| `gen_ai.usage.input_tokens` | int | Prompt/input token count |
| `gen_ai.usage.output_tokens` | int | Completion/output token count |
| `gen_ai.token.type` | string | Token type for token-level events |

**Custom attributes we should add for yardie.ai**:

| Attribute | Type | Description |
|-----------|------|-------------|
| `yardie.user_id` | string | User who made the request |
| `yardie.instance_id` | string | OpenWebUI instance ID |
| `yardie.tenant_id` | string | Tenant/organization ID |
| `yardie.subscription_tier` | string | User's subscription tier |
| `yardie.request_cost_usd` | float | Actual cost in USD |
| `yardie.budget_remaining_usd` | float | Remaining budget after request |
| `yardie.budget_utilization_pct` | float | Budget utilization percentage |

### 4.2 OpenTelemetry Instrumentation Libraries

**OpenLLMetry (Traceloop)** -- https://github.com/traceloop/openllmetry
- Most comprehensive auto-instrumentation for LLM calls
- Supports OpenAI, Anthropic, Cohere, and many more SDKs
- Automatically captures `gen_ai.*` attributes
- Available for Python (`opentelemetry-instrumentation-openai`) and JS/TS
- Wraps SDK calls to add spans with full request/response metadata
- **Best choice for instrumenting our proxy's outbound calls to OpenRouter**

**OpenLIT** -- https://github.com/openlit/openlit
- OpenTelemetry-native LLM observability
- Auto-instrumentation SDK + visualization dashboard
- Captures traces, metrics, and logs
- Includes GPU monitoring (not relevant for our proxy use case)
- Self-hostable dashboard
- Could serve as our observability dashboard

**opentelemetry-instrumentation-openai** (standalone)
- Part of the `opentelemetry-python-contrib` project
- Specifically instruments the OpenAI Python SDK
- Since OpenRouter uses OpenAI-compatible SDK, this works for our case

### 4.3 What to Capture

**Spans (traces)**:
```
[yardie-proxy] LLM Request
  |-- gen_ai.system: "openrouter"
  |-- gen_ai.request.model: "anthropic/claude-3.5-sonnet"
  |-- gen_ai.usage.input_tokens: 150
  |-- gen_ai.usage.output_tokens: 500
  |-- yardie.user_id: "user_abc123"
  |-- yardie.instance_id: "inst_xyz789"
  |-- yardie.request_cost_usd: 0.0045
  |-- yardie.budget_remaining_usd: 4.95
  |-- http.status_code: 200
  |-- Duration: 1.2s
```

**Metrics**:
- `gen_ai.client.token.usage` (histogram) -- tokens per request, by model and token type
- `gen_ai.client.operation.duration` (histogram) -- latency per request
- `yardie.proxy.request.cost` (counter) -- cost in USD, labeled by user/model/instance
- `yardie.proxy.budget.remaining` (gauge) -- per-user budget remaining
- `yardie.proxy.request.count` (counter) -- request count by user/model/status
- `yardie.proxy.request.blocked` (counter) -- requests blocked by budget/ACL

**Logs**:
- Structured logs for each request (request ID, user, model, status, cost)
- Budget alert logs (user approaching limit, user exceeded limit)
- Error logs (provider errors, timeout, rate limit)

### 4.4 Exporter Options for GCP

| Exporter | Use Case | Integration |
|----------|----------|-------------|
| **Cloud Trace** | Distributed tracing (spans) | `@google-cloud/opentelemetry-cloud-trace-exporter` or OTLP to Cloud Trace |
| **Cloud Monitoring** | Metrics (token usage, costs, latency) | `@google-cloud/opentelemetry-cloud-monitoring-exporter` or OTLP |
| **BigQuery** | Long-term analytics, detailed usage records | Export via Cloud Logging sink or direct BigQuery write |
| **Cloud Logging** | Structured logs | `@google-cloud/logging` or OTLP logs |
| **OTLP Collector** | Hub for all signals, then fan out | Run an OTel Collector that exports to GCP backends |

**Recommended setup**:
```
Proxy --> OTLP --> OTel Collector --> Cloud Trace (traces)
                                  --> Cloud Monitoring (metrics)
                                  --> Cloud Logging --> BigQuery (logs/analytics)
```

Using the OTel Collector as a hub gives flexibility to add/change backends without modifying the proxy code.

### 4.5 Dashboard and Alerting Patterns

**Dashboards (Cloud Monitoring or Grafana)**:
- Total spend by user (daily/weekly/monthly)
- Token usage by model (trending)
- Request latency P50/P95/P99 by model
- Budget utilization heatmap (which users are close to limits)
- Error rate by provider/model
- Requests blocked (budget vs ACL vs rate limit)

**Alerts**:
- User budget > 80% utilized
- User budget exhausted
- Proxy latency P95 > 500ms
- Error rate > 5% in 5-minute window
- OpenRouter rate limit approaching (from response headers)
- Total platform spend exceeds daily threshold

---

## 5. Build vs Buy Analysis

### 5.1 Custom Build from Scratch

**What it takes**:

| Component | Effort | Complexity |
|-----------|--------|------------|
| HTTP proxy with streaming (SSE) | 2-3 days | Medium |
| OpenAI-compatible API translation | 1-2 days | Low |
| OpenRouter integration | 1 day | Low |
| Virtual key management | 2-3 days | Medium |
| Per-user budget tracking (DB + Redis) | 3-4 days | Medium-High |
| Model access control | 1 day | Low |
| Token usage extraction (streaming) | 2-3 days | Medium |
| OpenTelemetry instrumentation | 2-3 days | Medium |
| Admin API for key/budget management | 2-3 days | Medium |
| Error handling, retries, fallback | 2-3 days | Medium |
| Load testing, hardening | 2-3 days | Medium |
| **Total estimate** | **20-30 days** | **Medium-High** |

**Tech stack options for custom build**:

| Stack | Pros | Cons |
|-------|------|------|
| **Node.js/TypeScript** | Same stack as yardie.ai portal (Next.js). Native streaming support. Rich ecosystem. | Single-threaded (mitigated by async I/O). Moderate performance. |
| **Go** | Excellent performance. Native concurrency. Small binary. Fast streaming. | Different language from portal. Smaller LLM ecosystem. |
| **Python (FastAPI)** | Best LLM ecosystem (tiktoken, openai SDK). LiteLLM is Python. | GIL limitations. Slower than Go/Rust for pure proxy workload. |
| **Rust** | Best performance. Memory safety. | Steepest learning curve. Slowest development. Smallest LLM ecosystem. |

### 5.2 Use LiteLLM as Foundation + Customize

**Approach**: Deploy LiteLLM Proxy, configure it for OpenRouter, use its virtual key and budget system, add custom middleware or callbacks for yardie.ai-specific logic.

**What LiteLLM gives us for free**:
- OpenAI-compatible proxy with streaming (done)
- OpenRouter integration (done)
- Virtual key management with budgets (done)
- Model access control per key (done)
- PostgreSQL-based spend tracking (done)
- Redis caching (done)
- Admin UI (done)
- OpenTelemetry export (done)

**What we still need to build**:
- Integration with yardie.ai user/subscription system (map yardie users to LiteLLM virtual keys)
- Custom budget logic tied to subscription tiers (API calls to LiteLLM admin API)
- Custom OpenWebUI instance identification (via headers or key mapping)
- Additional OTEL attributes for yardie.ai-specific data (via LiteLLM callbacks)
- Integration with our portal UI for usage dashboards

**Effort estimate**: 5-10 days

**Risks**:
- Dependency on LiteLLM's release cycle and breaking changes
- Complexity of customizing LiteLLM's internals if we need behavior it does not support
- Python dependency in a Node.js/TypeScript stack (separate service)

### 5.3 Hybrid: Custom Proxy + Existing Libraries

**Approach**: Build a lightweight custom proxy in TypeScript (fits our stack), use existing libraries for the hard parts.

**Libraries to leverage**:
- `openai` npm package for OpenAI-compatible API types and client
- `tiktoken` or `js-tiktoken` for token counting
- `@opentelemetry/*` for instrumentation
- `ioredis` for budget caching
- Drizzle ORM / Prisma for PostgreSQL usage records

**What we build**:
- Thin HTTP proxy (Node.js, ~500 lines for core)
- SSE streaming passthrough (well-documented pattern)
- Middleware: auth -> budget check -> model ACL -> proxy -> usage extraction -> budget update
- REST API for key/budget management (integrate with portal)

**Effort estimate**: 12-18 days

**Pros**:
- Full control
- Same language as rest of stack
- No external dependency risk
- Exactly fits our needs

**Cons**:
- More upfront work than LiteLLM approach
- We own all the edge cases

### 5.4 Recommendation

| Approach | Effort | Control | Risk | Recommended? |
|----------|--------|---------|------|--------------|
| Full custom build | 20-30 days | Full | Low (but time) | No |
| **LiteLLM + custom integration** | **5-10 days** | **High** | **Medium** | **Yes (Phase 1)** |
| Custom proxy + libraries | 12-18 days | Full | Low | Yes (Phase 2 if needed) |
| Hosted solution (Portkey/Helicone) | 2-3 days | Low | High (vendor) | No |

**Start with LiteLLM, plan for potential migration to custom if LiteLLM becomes a constraint.**

---

## 6. Architecture Patterns

### 6.1 Recommended Architecture: LiteLLM as Proxy Service

```
                                    yardie.ai Platform
 +-------------------------------------------------------------------+
 |                                                                     |
 |  +------------------+     +------------------+     +--------------+ |
 |  | OpenWebUI        |     | OpenWebUI        |     | OpenWebUI    | |
 |  | Instance A       |     | Instance B       |     | Instance C   | |
 |  | (User: alice)    |     | (User: bob)      |     | (User: carol)| |
 |  +--------+---------+     +--------+---------+     +------+-------+ |
 |           |                         |                      |        |
 |           |  API Key = vk_alice     |  API Key = vk_bob    |        |
 |           +------------+------------+----------------------+        |
 |                        |                                            |
 |                        v                                            |
 |           +---------------------------+                             |
 |           |    LiteLLM Proxy          |                             |
 |           |    (Docker container)     |                             |
 |           |                           |                             |
 |           |  - Virtual Key auth       |                             |
 |           |  - Budget enforcement     |                             |
 |           |  - Model ACL             |                             |
 |           |  - Rate limiting          |                             |
 |           |  - Usage extraction       |                             |
 |           |  - OTEL export            |                             |
 |           +--+-----+-----+-----------+                             |
 |              |     |     |                                          |
 |              |     |     +---> OTel Collector --> GCP Monitoring    |
 |              |     |                          --> GCP Trace         |
 |              |     |                          --> BigQuery          |
 |              |     |                                                |
 |              |     +---> PostgreSQL (usage/spend tracking)          |
 |              |                                                      |
 |              v           +---> Redis (budget cache, rate limits)    |
 |   +----------+-------+                                             |
 |   | yardie.ai Portal |  (Next.js)                                  |
 |   | - User management|                                             |
 |   | - Subscription   |                                             |
 |   |   tier mgmt      |                                             |
 |   | - Usage dashboard|                                             |
 |   | - Key provisioning|                                            |
 |   |   (calls LiteLLM |                                             |
 |   |    Admin API)     |                                            |
 |   +------------------+                                             |
 +-------------------------------------------------------------------+
                |
                v
    +------------------------+
    |    OpenRouter API       |
    |    openrouter.ai/api/v1 |
    +------------------------+
                |
                v
    +------------------------+
    |   LLM Providers        |
    |   (OpenAI, Anthropic,  |
    |    Google, Meta, etc.)  |
    +------------------------+
```

### 6.2 Request Flow (Detailed)

```
OpenWebUI                LiteLLM Proxy              OpenRouter
   |                          |                          |
   |-- POST /chat/completions |                          |
   |   Authorization: Bearer  |                          |
   |   vk_alice_xxxxx         |                          |
   |   {model: "anthropic/    |                          |
   |    claude-3.5-sonnet",   |                          |
   |    messages: [...],      |                          |
   |    stream: true}         |                          |
   |                          |                          |
   |                    1. Validate virtual key           |
   |                    2. Look up user (alice)           |
   |                    3. Check budget (Redis)           |
   |                       budget_remaining > $0.001?     |
   |                    4. Check model ACL                |
   |                       "anthropic/claude-3.5-sonnet"  |
   |                       in alice's allowed models?     |
   |                    5. Check rate limit               |
   |                       alice < 60 RPM?                |
   |                          |                          |
   |                    [If any check fails: return 429]  |
   |                          |                          |
   |                    6. Forward request                |
   |                          |-- POST /chat/completions |
   |                          |   Authorization: Bearer   |
   |                          |   OPENROUTER_API_KEY      |
   |                          |   {same body}             |
   |                          |                          |
   |                          |<-- SSE stream begins     |
   |<-- SSE stream begins     |                          |
   |   data: {"choices":[...]}|                          |
   |   data: {"choices":[...]}|                          |
   |   ...                    |                          |
   |   data: {"choices":[...],|                          |
   |     "usage": {           |                          |
   |       "prompt_tokens":150|                          |
   |       "completion_tokens"|                          |
   |       : 500}}            |                          |
   |   data: [DONE]           |                          |
   |                          |                          |
   |                    7. Extract usage from final chunk |
   |                    8. Calculate cost:                |
   |                       (150 * $3/1M) + (500 * $15/1M)|
   |                       = $0.00795                     |
   |                    9. Deduct from alice's budget     |
   |                       (Redis + PostgreSQL)           |
   |                   10. Emit OTEL span with:           |
   |                       gen_ai.usage.input_tokens: 150 |
   |                       gen_ai.usage.output_tokens: 500|
   |                       yardie.user_id: alice          |
   |                       yardie.request_cost_usd: 0.008 |
   |                          |                          |
```

### 6.3 Streaming SSE Passthrough Pattern

The proxy must handle Server-Sent Events (SSE) streaming. The pattern:

```
Client <--SSE-- Proxy <--SSE-- OpenRouter

Proxy behavior:
1. Open connection to OpenRouter with Transfer-Encoding: chunked
2. For each SSE chunk received from OpenRouter:
   a. Parse the chunk
   b. Forward it immediately to the client (do not buffer)
   c. If chunk contains "usage" field, extract and store it
3. When stream ends ([DONE]):
   a. Forward [DONE] to client
   b. Process accumulated usage data
   c. Update budget, emit telemetry
```

In Node.js, this is implemented using readable streams and the `TransformStream` or `ReadableStream` API. In Python (LiteLLM), it uses async generators.

**Key implementation detail**: The proxy MUST NOT buffer the entire stream. Each chunk must be forwarded as received to minimize latency. Usage extraction happens on the final chunk only.

### 6.4 Proxy as Separate Service vs Embedded

| Approach | Pros | Cons |
|----------|------|------|
| **Separate service (RECOMMENDED)** | Independent scaling, isolation, can use different tech, clear separation of concerns | Additional infrastructure, network hop |
| Embedded in portal (Next.js API route) | Simpler deployment, shared auth | Couples proxy to portal lifecycle, harder to scale independently, portal restarts affect proxy |

**Recommendation: Separate service.** The proxy handles high-throughput streaming connections that have very different scaling characteristics from the portal (which serves HTML/API). LiteLLM as a Docker container fits this pattern naturally.

### 6.5 Caching Strategies

**Response caching (semantic cache)**:
- LiteLLM supports Redis-based caching: identical requests return cached responses
- Reduces cost and latency for repeated queries
- Configurable TTL
- Risk: stale responses. Must be opt-in per use case.
- Recommendation: Enable with short TTL (5 min) for cost savings, allow users to bypass with a header

**Budget cache (Redis)**:
- Pre-computed budget remaining, stored in Redis
- Updated on every request (write-through)
- Synced to PostgreSQL for durability
- If Redis is unavailable, fall back to PostgreSQL (higher latency)

**Model pricing cache**:
- Cache OpenRouter's model pricing (from `/models` endpoint) in Redis
- Refresh every hour
- Used for pre-request cost estimation

### 6.6 Rate Limiting Patterns

**Per-user rate limits** (implemented in LiteLLM):
- Requests per minute (RPM) -- e.g., 60 RPM for standard tier
- Tokens per minute (TPM) -- e.g., 100K TPM for standard tier
- Concurrent requests -- e.g., 5 concurrent for standard tier

**Tiered rate limits**:
```
Free tier:     10 RPM,  20K TPM, 2 concurrent
Standard tier: 60 RPM, 100K TPM, 5 concurrent
Pro tier:     200 RPM, 500K TPM, 20 concurrent
```

Configured via LiteLLM virtual key parameters.

### 6.7 Failover and Error Handling

```
Request --> LiteLLM Proxy
              |
              +--> OpenRouter (primary)
              |      |
              |      +--> [If 429 rate limit] --> Retry with backoff (max 3)
              |      +--> [If 500 server error] --> Retry once
              |      +--> [If 503 overloaded] --> Return 503 to client
              |      +--> [If timeout (30s)] --> Return 504 to client
              |
              +--> [If OpenRouter fully down] --> Return 503 with
                   "Service temporarily unavailable" to client
```

LiteLLM supports fallback routing (e.g., try OpenRouter, fall back to direct provider), but for yardie.ai, OpenRouter IS our provider layer, so fallback would be limited to retries.

---

## 7. Recommendation for yardie.ai

### Phase 1: LiteLLM Proxy (Weeks 1-2)

**Deploy LiteLLM Proxy as a Docker service alongside the yardie.ai platform.**

Steps:
1. Deploy LiteLLM Proxy container with PostgreSQL and Redis
2. Configure OpenRouter as the provider:
   ```yaml
   model_list:
     - model_name: anthropic/claude-3.5-sonnet
       litellm_params:
         model: openrouter/anthropic/claude-3.5-sonnet
         api_key: os.environ/OPENROUTER_API_KEY
     - model_name: openai/gpt-4-turbo
       litellm_params:
         model: openrouter/openai/gpt-4-turbo
         api_key: os.environ/OPENROUTER_API_KEY
     # ... more models
   ```
3. Create virtual keys for each user via LiteLLM Admin API
4. Set per-key budgets and model allowlists based on subscription tier
5. Configure OpenWebUI instances to use LiteLLM Proxy as their API base URL
6. Configure OTLP export to OTel Collector
7. Build portal integration:
   - API to provision/manage virtual keys when users sign up or change tiers
   - Usage dashboard pulling from LiteLLM's PostgreSQL
   - Budget alert system

### Phase 2: Custom Enhancements (Weeks 3-4)

1. Add LiteLLM custom callbacks for yardie.ai-specific telemetry attributes
2. Build usage analytics dashboard in the portal
3. Implement tiered model access (map subscription tiers to model lists)
4. Add semantic caching for cost reduction
5. Set up GCP monitoring dashboards and alerts

### Phase 3: Evaluate and Optimize (Ongoing)

1. Monitor LiteLLM's performance overhead (latency added)
2. If LiteLLM becomes a bottleneck or constraint, evaluate building a custom TypeScript proxy
3. Continuously tune budgets and rate limits based on real usage patterns
4. Add more models as OpenRouter expands

### Why LiteLLM over Custom Build

1. **80% of the work is done**: Budget enforcement, streaming proxy, usage tracking, virtual keys
2. **5-10 days vs 20-30 days**: Dramatically faster time to market
3. **Battle-tested**: Used in production by many companies, edge cases handled
4. **Active maintenance**: Daily updates, quick bug fixes, responsive community
5. **MIT license**: We can fork and modify if needed
6. **Clean escape path**: If we outgrow it, we can migrate to custom since the API surface (OpenAI-compatible) stays the same for our OpenWebUI instances

### Configuration Blueprint for OpenWebUI Integration

Each managed OpenWebUI instance needs:
1. A LiteLLM virtual API key (mapped to the owning user)
2. `OPENAI_API_BASE_URL` set to the LiteLLM Proxy URL
3. `OPENAI_API_KEY` set to the virtual key
4. Model list configured to show only the models the user's tier allows

OpenWebUI natively supports custom OpenAI-compatible endpoints, making this integration straightforward.

---

## 8. Open Questions

1. **Single LiteLLM instance or per-tenant?** A single shared LiteLLM Proxy is simpler but creates a single point of failure. Per-tenant would provide isolation but is operationally expensive. Recommendation: single instance with proper monitoring, scale horizontally if needed.

2. **Budget currency: USD or tokens?** LiteLLM tracks spend in USD. OpenRouter provides cost per request. Should user-facing budgets be in USD ("you have $5/month") or tokens ("you have 1M tokens/month")? USD is simpler since token costs vary by model.

3. **What happens when a user upgrades mid-month?** Does their budget increase immediately? Does their model access expand immediately? Need to define the billing lifecycle.

4. **Should we cache/log prompts and responses?** Helicone-style logging of full conversations enables debugging and analytics but raises privacy/storage concerns. Need a policy.

5. **OpenRouter API key strategy**: Single org-level key for all users (simpler, OpenRouter sees us as one customer) vs per-user keys (more isolation, but harder to manage, and users might extract them). Recommendation: single org-level key managed by the proxy.

6. **How to identify which OpenWebUI instance a request comes from?** Options: unique virtual key per instance, custom header injection in OpenWebUI config, or source IP mapping. Virtual key per instance is cleanest.

7. **Latency budget**: What is the acceptable added latency? LiteLLM adds ~10-30ms per request. Is this acceptable? For LLM calls that take 1-30 seconds, this is negligible.

8. **Disaster recovery**: If the proxy goes down, all LLM access stops. Need a health check, auto-restart, and potentially a hot standby.

9. **Model pricing updates**: OpenRouter model prices change. How frequently should we refresh our pricing cache? Recommendation: hourly, with manual override capability.

10. **Multi-region**: If yardie.ai expands to multiple regions, do we need regional proxy instances? Initially no, but design for it.

---

## Sources and References

### Solution Documentation
- LiteLLM Docs: https://docs.litellm.ai/
- LiteLLM Proxy Server: https://docs.litellm.ai/docs/simple_proxy
- LiteLLM Virtual Keys: https://docs.litellm.ai/docs/proxy/virtual_keys
- LiteLLM Budget Management: https://docs.litellm.ai/docs/proxy/users
- Portkey AI Gateway: https://docs.portkey.ai/
- Portkey OSS Gateway: https://github.com/Portkey-ai/gateway
- Helicone Docs: https://docs.helicone.ai/
- MLflow AI Gateway: https://mlflow.org/docs/latest/llms/gateway/
- Kong AI Gateway: https://docs.konghq.com/gateway/latest/ai-gateway/
- Cloudflare AI Gateway: https://developers.cloudflare.com/ai-gateway/

### OpenRouter
- OpenRouter API Docs: https://openrouter.ai/docs
- OpenRouter Models: https://openrouter.ai/models
- OpenRouter Pricing: https://openrouter.ai/docs#models

### OpenTelemetry
- GenAI Semantic Conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/
- OpenLLMetry (Traceloop): https://github.com/traceloop/openllmetry
- OpenLIT: https://github.com/openlit/openlit
- GCP OpenTelemetry Exporters: https://cloud.google.com/trace/docs/setup/python-ot

### GitHub Repositories
- LiteLLM: https://github.com/BerriAI/litellm
- Portkey Gateway: https://github.com/Portkey-ai/gateway
- Helicone: https://github.com/Helicone/helicone
- OpenLLMetry: https://github.com/traceloop/openllmetry
- OpenLIT: https://github.com/openlit/openlit
- Langfuse: https://github.com/langfuse/langfuse

### Architecture References
- OpenAI API Streaming: https://platform.openai.com/docs/api-reference/streaming
- SSE Specification: https://html.spec.whatwg.org/multipage/server-sent-events.html\