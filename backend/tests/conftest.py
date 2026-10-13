import pytest
from backend.app import create_app
from backend.app.database import Base, get_engine, get_db

@pytest.fixture(scope="session")
def app():
    """Create test application configured for testing with in-memory SQLite."""
    test_app = create_app("testing")
    yield test_app

@pytest.fixture(autouse=True)
def clean_db(app):
    """Ensure database tables are fresh before each test run."""
    engine = get_engine()
    with app.app_context():
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        yield
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(app):
    """Flask test client."""
    return app.test_client()
