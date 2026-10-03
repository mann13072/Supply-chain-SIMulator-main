import os
from workers import DurableObject, WorkerEntrypoint, asgi
from durable_database import bind_storage, reset_storage


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        backend = self.env.BACKEND.get(self.env.BACKEND.idFromName("solarchain"))
        return await backend.fetch(request)


class SupplyChainBackend(DurableObject):
    def __init__(self, ctx, env):
        super().__init__(ctx, env)
        os.environ["CLOUDFLARE_WORKER"] = "1"
        os.environ["ALLOWED_ORIGINS"] = str(env.ALLOWED_ORIGINS)
        os.environ["JWT_SECRET"] = str(getattr(env, "JWT_SECRET", ""))
        if getattr(env, "GEMINI_API_KEY", None):
            os.environ["GEMINI_API_KEY"] = str(env.GEMINI_API_KEY)
        token = bind_storage(ctx.storage)
        try:
            from starlette.formparsers import MultiPartParser
            MultiPartParser.spool_max_size = 8 * 1024 * 1024
            from server import app
            self.app = app
        finally:
            reset_storage(token)

    async def fetch(self, request):
        token = bind_storage(self.ctx.storage)
        try:
            return await asgi.fetch(self.app, request, self.env, self.ctx)
        finally:
            reset_storage(token)
