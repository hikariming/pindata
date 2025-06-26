# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PinData is a large language model training dataset management system with a plugin-based architecture. The system uses a pipeline-based data processing approach inspired by MongoDB's aggregation pipeline concept.

### Architecture

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Zustand for state management
- **Backend**: Flask + SQLAlchemy + PostgreSQL + MinIO object storage + Celery task queue
- **Infrastructure**: Docker Compose for development and deployment

### Key Components

1. **Dataset Management**: Git-style versioning for datasets with metadata tracking
2. **Plugin System**: Extensible parsers (DOCX, PPTX, PDF), cleaners, and distillers for data processing
3. **Pipeline Processing**: Configurable data transformation workflows (extract → clean → distill → output)
4. **Async Task Processing**: Celery workers for long-running operations like file conversion and dataset generation

## Development Commands

### Backend Development

```bash
cd backend

# Setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp config.example.env .env

# Database setup
python migrations/init_db.py

# Run development server
python run.py  # Starts on port 8897

# Start Celery worker (required for async tasks)
./start_celery.sh                    # For process-based workers
./start_celery_threads.sh           # For thread-based workers (better for macOS)
# OR manually:
celery -A celery_worker.celery worker --loglevel=info --concurrency=4

# Code quality
black .          # Format code
flake8 .         # Lint code
pytest           # Run tests
pytest --cov=app tests/  # Run tests with coverage

# Manual API testing
python test/test_api.py             # Test basic API endpoints
python test/test_libraries_api.py   # Test library-specific endpoints
```

### Frontend Development

```bash
cd frontend

# Setup and run
npm install
npm run dev      # Starts on port 5173

# Build for production
npm run build
```

### Docker Development

```bash
# Docker Compose files location: docker/
cd docker

# Start all services (recommended for development)
docker compose up -d

# View logs
docker compose logs -f [service_name]

# Stop services
docker compose down

# Alternative: Use root start script for local development
# This starts backend, frontend, and celery workers outside Docker
./start.sh
```

## Testing

### Backend Testing
- Main framework: pytest
- Test files located in `backend/test/` and `backend/tests/`
- Manual API test scripts: `python test/test_api.py`, `python test/test_libraries_api.py`

### Frontend Testing
- **Note**: No automated testing framework currently configured
- Only manual testing via development server

## Key File Locations

### Backend Structure
- **API Endpoints**: `backend/app/api/v1/endpoints/`
- **Models**: `backend/app/models/`
- **Services**: `backend/app/services/`
- **Plugins**: `backend/app/plugins/` (parsers, cleaners, distillers)
- **Tasks**: `backend/app/tasks/` (Celery async tasks)
- **Migrations**: `backend/migrations/`

### Frontend Structure
- **Pages/Screens**: `frontend/src/screens/`
- **Components**: `frontend/src/components/`
- **Services**: `frontend/src/services/`
- **Hooks**: `frontend/src/hooks/`
- **State Management**: Uses Zustand, stores in component directories

### Plugin Development
- Custom plugins go in `plugins/` directory
- Inherit from base classes in `backend/app/plugins/base_plugin.py`
- Register plugins in the appropriate registration functions

## Data Flow Architecture

1. **Raw Data**: Files uploaded to MinIO storage via `storage_service.py`
2. **Processing**: Celery tasks convert files using plugin system (parsers → cleaners → distillers)
3. **Dataset Creation**: Enhanced datasets generated from processed files using LLM services
4. **Versioning**: All datasets support Git-style versioning with parent-child relationships

## Environment Variables

Key variables defined in `backend/config.example.env`:
- `DATABASE_URL`: PostgreSQL connection
- `MINIO_*`: Object storage configuration
- `CELERY_BROKER_URL`: Redis for task queue
- `FLASK_ENV`: development/production

## Important Implementation Notes

- **Port Configuration**: Backend runs on port 8897 (not standard 5000), Frontend on port 5173 (dev) / 3000 (production)
- **Celery Dependency**: Celery worker must be running for file processing and dataset generation
- **macOS Compatibility**: Use `start_celery_threads.sh` on macOS for better stability
- **Storage Architecture**: All file operations go through MinIO object storage, not local filesystem
- **Plugin System**: Supports runtime loading of custom processors from `plugins/` directory
- **LLM Integration**: Dataset generation uses LangChain with multi-provider support (OpenAI, Google, Anthropic)
- **Database**: Uses PostgreSQL with SQLAlchemy ORM and migration system
- **Authentication**: JWT-based auth with user management and role-based permissions

## Internationalization

- Frontend supports i18n with English, Chinese, and Japanese locales
- Locale files: `frontend/src/i18n/locales/` (en/, zh/, ja/)
- Uses react-i18next for translation management

## Deployment

### Production Deployment
- Frontend builds static files served by nginx
- Backend API and Celery workers run in separate containers
- Uses MinIO for object storage, PostgreSQL for metadata, Redis for task queuing
- All services orchestrated via Docker Compose in `docker/` directory

### Development vs Production Environment Variables
- Development: Uses localhost endpoints for services
- Production: Uses Docker service names for internal communication
- Key differences in `backend/config.example.env` are commented for Docker deployment