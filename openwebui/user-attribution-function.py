"""
OpenWebUI Filter Function: User Attribution

Injects user identity into outgoing LLM request metadata so that
LiteLLM can attribute usage to the correct user and instance.

Deploy via admin API or admin UI on each OpenWebUI instance.
See: scripts/deploy-function.ts for automated deployment.
"""

from pydantic import BaseModel


class Filter:
    class Valves(BaseModel):
        priority: int = 0
        instance_id: str = ""

    def __init__(self):
        self.valves = self.Valves()

    def inlet(self, body: dict, __user__: dict) -> dict:
        if "metadata" not in body:
            body["metadata"] = {}
        body["metadata"]["user_id"] = __user__.get("id", "")
        body["metadata"]["user_email"] = __user__.get("email", "")
        body["metadata"]["instance_id"] = self.valves.instance_id
        return body

    def outlet(self, body: dict, __user__: dict) -> dict:
        return body
