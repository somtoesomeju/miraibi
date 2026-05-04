from fastapi import FastAPI
import duckdb
from anthropic import Anthropic

app = FastAPI(title="Miraibi Backend", description="Backend API for Miraibi BI tool using Claude for insights")

# Initialize DuckDB connection
conn = duckdb.connect(database=':memory:', read_only=False)

# Placeholder for Claude API key - set via environment variable
# anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

@app.get("/")
def root():
    return {"message": "Welcome to Miraibi Backend API"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# TODO: Add endpoints for data analysis, Claude integration, etc.