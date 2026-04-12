"""
OpenWebUI Filter Function: User Attribution

Injects the user's email into the `user` field of outgoing LLM requests.
LiteLLM uses this to:
  - Track per-user spend in LiteLLM_SpendLogs (end_user column)
  - Enforce per-user budgets via LiteLLM_EndUserTable

Deploy via: scripts/deploy-function.ts
"""

from pydantic import BaseModel


class Filter:
    class Valves(BaseModel):
        priority: int = 0

    def __init__(self):
        self.valves = self.Valves()

    def inlet(self, body: dict, __user__: dict) -> dict:
        body["user"] = __user__.get("email", "")
        return body

    def outlet(self, body: dict, __user__: dict) -> dict:
        return body
