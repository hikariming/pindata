backend: CONDA_PATH=$(conda info --base); cd backend && $CONDA_PATH/envs/pindata-env/bin/python run.py
celery: CONDA_PATH=$(conda info --base); cd backend && $CONDA_PATH/envs/pindata-env/bin/celery -A celery_worker.celery worker --loglevel=info --pool=threads --concurrency=4 -n worker@%h
frontend: cd frontend && pnpm run dev 