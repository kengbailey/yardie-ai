"""
OpenWebUI Filter Function: User Attribution

Injects user identity into the `user` field of outgoing LLM requests
so that LiteLLM can attribute usage to the correct user and instance.

Format: {user_id}::{user_email}::{instance_id}

LiteLLM captures the `user` field and stores it in the `end_user`
column of LiteLLM_SpendLogs.

Deploy via: scripts/deploy-function.ts
"""

from pydantic import BaseModel


class Filter:
    class Valves(BaseModel):
        priority: int = 0
        instance_id: str = ""

    def __init__(self):
        self.valves = self.Valves()

    def inlet(self, body: dict, __user__: dict) -> dict:
        user_id = __user__.get("id", "")
        user_email = __user__.get("email", "")
        instance_id = self.valves.instance_id
        body["user"] = f"{user_id}::{user_email}::{instance_id}"
        return body

    def outlet(self, body: dict, __user__: dict) -> dict:
        return body
