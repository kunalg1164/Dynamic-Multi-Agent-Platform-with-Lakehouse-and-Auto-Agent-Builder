import time
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker
from ..core.config import get_settings

settings = get_settings()
connect_args = {}
if settings.database_url.startswith("postgres"):
    connect_args = {"connect_timeout": 5}

engine = create_engine(
    settings.database_url,
    future=True,
    pool_pre_ping=True,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def wait_for_database(engine, timeout: int = 30, interval: float = 1.0) -> None:
    start_time = time.time()
    while True:
        try:
            with engine.connect() as connection:
                connection.exec_driver_sql("SELECT 1")
            return
        except OperationalError:
            elapsed = time.time() - start_time
            if elapsed >= timeout:
                raise
            time.sleep(interval)
