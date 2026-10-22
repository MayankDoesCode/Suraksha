import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from sqlalchemy.pool import StaticPool

logger = logging.getLogger(__name__)

Base = declarative_base()

# Global session holder
_engine = None
_session_factory = None

def init_db(database_url: str):
    """Initialize SQLAlchemy engine and session factory."""
    global _engine, _session_factory
    
    connect_args = {}
    engine_kwargs = {"echo": False}
    
    # Render and Heroku use postgres:// which SQLAlchemy 2.0 requires as postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        if ":memory:" in database_url:
            engine_kwargs["poolclass"] = StaticPool
    else:
        # PostgreSQL / cloud database resilience
        engine_kwargs["pool_pre_ping"] = True
        engine_kwargs["pool_recycle"] = 300
        engine_kwargs["pool_size"] = 10
        engine_kwargs["max_overflow"] = 20
            
    _engine = create_engine(
        database_url,
        connect_args=connect_args,
        **engine_kwargs
    )

    
    _session_factory = scoped_session(
        sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    )
    
    # Create tables if not existing (for initial local dev / tests)
    Base.metadata.create_all(bind=_engine)
    logger.info("Database initialized with URL: %s", database_url.split("@")[-1])
    return _engine

def get_engine():
    """Get active SQLAlchemy engine."""
    return _engine

def get_db():
    """Get active scoped database session."""
    if _session_factory is None:
        raise RuntimeError("Database has not been initialized. Call init_db first.")
    return _session_factory()


from contextlib import contextmanager

@contextmanager
def transaction_scope():
    """
    Provide a transactional scope around a series of database operations.
    Automatically commits on success and rolls back on exception.
    """
    session = get_db()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise


def close_db(exception=None):
    """Teardown active scoped database session with safe rollback on error."""
    global _session_factory
    if _session_factory is not None:
        if exception is not None:
            try:
                _session_factory().rollback()
            except Exception as rb_err:
                logger.warning("Error rolling back session on teardown: %s", rb_err)
        _session_factory.remove()


def check_db_connection() -> tuple[bool, str]:
    """Test database connectivity with an active ping query."""
    if _engine is None:
        return False, "Database engine not initialized"
    try:
        with _engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "Database is operational"
    except Exception as exc:
        logger.error("Database health check failed: %s", str(exc))
        return False, f"Database connectivity failed: {str(exc)}"

