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
./start_celery.sh
# OR manually:
celery -A celery_worker.celery worker --loglevel=info --concurrency=4

# Code quality
black .          # Format code
flake8 .         # Lint code
pytest           # Run tests
pytest --cov=app tests/  # Run tests with coverage
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
# Start all services (recommended for development)
docker-compose up -d

# View logs
docker-compose logs -f [service_name]

# Stop services
docker-compose down
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

- Backend runs on port 8897 (not standard 5000)
- Frontend expects API at port 8897 when running locally
- Celery worker must be running for file processing and dataset generation
- Plugin system supports runtime loading of custom processors
- All file operations go through MinIO object storage, not local filesystem
- Dataset generation uses LLM integration (OpenAI, Google, Anthropic via LangChain)

## Internationalization

- Frontend supports i18n with English and Chinese locales
- Locale files: `frontend/src/i18n/locales/`