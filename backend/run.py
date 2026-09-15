"""PyInstaller entry point.

Imports the app object directly (not the "app:app" import string) so the
frozen binary doesn't need to re-import the module by name at runtime, and
binds to loopback only.
"""

import uvicorn
from app import app

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765)
