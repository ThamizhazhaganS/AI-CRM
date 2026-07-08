from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL
import socket

# Check connectivity to remote database
if "sqlite" in DATABASE_URL.lower():
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    try:
        # Simple extraction of host and port for connectivity test
        url = DATABASE_URL
        remainder = url.split("@")[-1]
        host_port = remainder.split("/")[0]
        if ":" in host_port:
            host, port = host_port.split(":")
            port = int(port)
        else:
            host = host_port
            port = 5432
        
        # Test TCP connection with a fast 0.3-second timeout
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.3)
        s.connect((host, port))
        s.close()
        
        # If connection succeeds, create postgres engine
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    except Exception as e:
        print(f"\n[Database Warning] Failed to connect to remote database: {e}")
        print("Falling back to local SQLite database (estateai.db) for offline development...\n")
        DATABASE_URL = "sqlite:///./estateai.db"
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency: yields a database session and ensures it closes after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
