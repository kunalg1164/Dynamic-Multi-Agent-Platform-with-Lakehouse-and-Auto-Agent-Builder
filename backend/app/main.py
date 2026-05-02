from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import api_router
from .db.session import engine, wait_for_database
from .db.base import Base

app = FastAPI(title="Dynamic Multi-Agent Finance Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] ,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event() -> None:
    wait_for_database(engine)
    Base.metadata.create_all(bind=engine)

app.include_router(api_router, prefix="/api")

@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "backend"}
