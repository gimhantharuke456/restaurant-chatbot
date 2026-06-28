from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # PostgreSQL
    database_url: str = "postgresql://gimhanrajapaksha@localhost:5432/agent_platform"

    # Redis
    redis_url: str = "redis://redis:6379"

    # Neo4j
    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "neo4j123"

    # Vertex AI / Gemini
    google_application_credentials: str = "/app/credentials/gcp-key.json"
    vertex_project_id: str = "your-gcp-project-id"
    vertex_location: str = "us-central1"
    gemini_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "text-embedding-004"
    use_fake_embeddings: bool = False

    # Backend API (Node/Express service)
    backend_url: str = "http://localhost:3000"

    # Firebase / Firestore
    firebase_project_id: str = "your-firebase-project-id"
    firebase_private_key: str = ""
    firebase_client_email: str = ""
    firestore_project_id: str = "your-firebase-project-id"
    firebase_credentials_file: str = ""  # path to Firebase Admin SDK JSON key; falls back to google_application_credentials

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
