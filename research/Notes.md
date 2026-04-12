# Notes 



## Auth Solution
- Auth vs OIDC
- For auth, Better Auth seems like a great fit
- For OIDC, Authentik seems like a great fit
- There was mention of migrating from Better Auth to Authentik, at least in some parts of solution. I need to understand I we can start with Authentik or if we need both. 
- We definitely want to stick with postgres for the database; we may have sqlite right now, but that's only for logging emails and small things. We'll move directly to postgres in our first iteration
- Scoped role table with Better Auth for RBAC 
- We'll use Better Auth hooks api for user provisioning events
- Argon2id for password hashing 
- For Cross-Subdomain Authentication we'll use SSO via OIDC
- We'll use Resend for verification emails and password resets
- Admins will assign users to instances after setup; This should be part of the setup flow. The user will receive an email telling them that they are ready to login. Before this we handle user provisioning within environments and instance assignment. We'll likely automate this in the future to be more deterministic or rules based. 
- First iteration involves SSO, we'll start with this 
- We'll be sure that postgres is our database of choice and individual services should have thier own postgres instance so we have good separation. 
- A user can be a manager of multiple instances
- First sysadmin account should be created via a secure but straight forward manner. You decide
- Session duration is 7 days
- For rate limiting we can use Redis


## LLM Proxy
- LiteLLM it is
- Lets use Character/word heuristic for pre-request estimation
- Token Counting on Streaming Responses --> Count from final streaming chunk
- Budget Enforcement Strategy ::
    1. Receive request
    2. Pre-check: is remaining budget > minimum_request_cost (e.g., $0.001)?
    - No: REJECT with 429 and informative error
    - Yes: continue
    3. Optionally: set max_tokens in the request to cap output based on remaining budget
    4. Forward to OpenRouter
    5. Extract actual usage from response
    6. Deduct actual cost from budget
    7. If budget now < minimum_request_cost: flag user for next-request blocking
- Handling Budget Exhaustion Mid-Stream --> Allow stream to complete, deduct full cost
- Caching Token Counts
    - Cache model pricing data from OpenRouter's /models endpoint (refresh hourly)
    - Cache per-user budget balances in Redis (write-through to PostgreSQL)
    - Use Redis for fast pre-check lookups
    - Reconcile Redis with PostgreSQL periodically and on read
- OpenTelemetry Integration for LLM Observability
    - We won't implement this in the first phase, but we want this observabililty
- Build vs Buy Analysis
    - I want to use as much as we can from open source and off the shelf solutions
    - If there is custom integrations or pieces to build lets do them in python or Go. I'm partial to Go for speed, but I understand python may be preferred for usability or existing libraries available. 
- Recommended Architecture: LiteLLM as Proxy Service; Lets go with this. 
- Proxy as Separate Service vs Embedded --> Separate service
- Rate Limiting Patterns
    - I like the tiered approach; we'll figure out limits for each tier in the future, but we'll go with this approach. Free. Standard. Pro. 
- Single LiteLLM instance for entire service; no need for multiple 
- Budget Currency is in USD
- What happens when a user upgrades mid-month --> budgets + model access increased immediately (with some lag; lets say within the hour or as fast as we can do it reliably)
- Should we cache/log prompts and responses? --> Yes. We'll store in s3, likely in iceberg tables b/c this data could grow massively
- OpenRouter API key strategy: Single org-level key
- How to identify which OpenWebUI instance a request comes from? --> Unique virtual key per instance 
- Latency budget --> let's not focus on this too much right now. We'll I'm fine with added latency of LiteLLM
- Disaster recovery --> Would love a hot swappable instance, we can work towards this. For now, we'll have auto restart and handle the hot swappable instances in the event this service becomes profitable and I want to increase reliability of service
- Model pricing updates - twice per day. We can change in the future. 
- No multi region support needed right now 

## OpenWebUI API
- We'll use pipelines to identify users at the proxy
- We'll use per instance api keys 
- Open Questions
    1. I'm not sure how reliable pipelines are under load; we may want to consider functions. The network hop for pipelines may introduce too much latency so we may want to switch to functions. I'm not quite sure yet; but we'll take your reccomendations on what to use first. Please research this and pick a path. 
    2. We do want to pin to a version of OpenWebUI, this project changes quite frequently so I dont want to be surprised by these changes. We'll test new versions and make changes before we integrate new versions. 
    3. When a user logs in via OIDC for the first time, does OpenWebUI auto-create the account with DEFAULT_USER_ROLE? Yes!
    4. Some settings only available as environment variables. I'll leave that up to you as to which ones are used as env variables and which ones are able to be configured via endpoints. 
    5. Yeah we'll do that testing at some point. 
    6. Yeah they do support websockets
    7. We'll leave RAG per tenant right now. We'll likely scale to a unified instance in the future. 
    8. OpenWebUI update strategy ... we'll cross this bridge in a future session. Not worried about this right now. We'll use the latest version available when testing and then we'll pin until we're ready to upgrade. 
    9. Invidivual instances can be backed up and should be backed up 
    10. Rate limiting is handled at the Proxy w/ LiteLLM 
    11. I'm quite sure each instance needs to be configured individually for functions, but we may be able to automate this by doing it programatically 
    12. MCP can be configured via UI, not sure via API. We can look into this. at the lease we'll have a web mcp connected to each instance


## General Notes
- We want to test this out with a smaller implementation and then we'll move to a larger cloud deployment
- I want to use K8s and Helm where possible; i know we may be using docker at the start while we prove out different pieces before scaling to more instances
- 
