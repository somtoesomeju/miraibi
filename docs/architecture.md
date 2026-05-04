# Miraibi Architecture

## Overview
Miraibi is a BI (Business Intelligence) tool that leverages Claude AI for generating insights from data stored in DuckDB.

## Components

### Backend
- **Framework**: FastAPI (Python)
- **Database**: DuckDB (embedded analytical database)
- **AI Integration**: Anthropic Claude API for natural language insights

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Purpose**: User interface for interacting with BI insights

### Semantic Layer
- **Format**: YAML definitions
- **Purpose**: Define data models, metrics, and insights (MiraiML layer)

### Documentation
- **Format**: Markdown files
- **Purpose**: Architecture docs, getting started guides, API references