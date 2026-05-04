# Getting Started with Miraibi

## Prerequisites
- Python 3.8+
- Node.js 18+
- Anthropic API key

## Setup

### Backend
1. Navigate to `backend/` directory
2. Create virtual environment: `python -m venv venv`
3. Activate: `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Set environment variable: `export ANTHROPIC_API_KEY=your_key_here`
6. Run server: `uvicorn main:app --reload`

### Frontend
1. Navigate to `frontend/` directory
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`

### Semantic Layer
- Edit YAML files in `semantic/` to define your data models and insights

## Usage
- Access frontend at `http://localhost:5173`
- Backend API at `http://localhost:8000`
- Use the semantic definitions to configure BI insights