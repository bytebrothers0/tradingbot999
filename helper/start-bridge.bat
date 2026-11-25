@echo off
cd /d "%~dp0"
where python >nul 2>nul || (echo Install Python 3.11+ from python.org and tick "Add to PATH". & pause & exit /b 1)
python -m pip install --quiet -r requirements.txt
python tickpulse_bridge.py %*
pause
