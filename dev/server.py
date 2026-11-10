# Dev-only: serves dashboard/plugin_api.py under /api/plugins/git-gui plus
# the bundled dev page. Run: .venv/bin/python dev/server.py [port]
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dashboard'))

import plugin_api
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'])
app.include_router(plugin_api.router, prefix='/api/plugins/git-gui')
app.mount('/', StaticFiles(directory=str(Path(__file__).parent / 'dist'), html=True), name='dev')

if __name__ == '__main__':
    uvicorn.run(app, host='127.0.0.1', port=int(sys.argv[1]) if len(sys.argv) > 1 else 8817)
