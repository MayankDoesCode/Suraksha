import pytest
from backend.app import create_app
from backend.app.database import Base, get_engine, get_db
from backend.app.utils.auth import create_dev_token

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
def auth_token(app):
    """Generate default admin development token for testing."""
    with app.app_context():
        return create_dev_token(uid="analyst-lead-001", email="lead@suraksha.local", role="admin")

@pytest.fixture
def auth_headers(auth_token):
    """Default Authorization header mapping."""
    return {"Authorization": f"Bearer {auth_token}"}

@pytest.fixture
def client(app, auth_token):
    """Authenticated Flask test client with default admin authorization."""
    test_client = app.test_client()
    test_client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {auth_token}"
    return test_client

@pytest.fixture
def unauth_client(app):
    """Unauthenticated Flask test client without credentials."""
    return app.test_client()
