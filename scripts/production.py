"""Run the web server and local SQL parser as one deployable application."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import urllib.request


def main():
    stopping = False
    children = []

    def stop(_signum, _frame):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        template = Path('/etc/nginx/templates/nginx.conf.template').read_text()
        Path('/etc/nginx/nginx.conf').write_text(
            template.replace('${FRED_API_KEY}', os.environ.get('FRED_API_KEY', ''))
        )
        subprocess.run(['nginx', '-t'], check=True)
        parser = subprocess.Popen(
            [sys.executable, '-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '6005'],
            cwd='/app/backend',
        )
        children.append(parser)
        inquiry = subprocess.Popen(
            [sys.executable, '/app/inquiry.py'],
        )
        children.append(inquiry)

        def wait_ready(url, name, child, timeout=30):
            deadline = time.monotonic() + timeout
            while not stopping:
                if child.poll() is not None:
                    raise RuntimeError(f'{name} exited during startup ({child.returncode})')
                try:
                    with urllib.request.urlopen(url, timeout=1) as response:
                        if response.status == 200:
                            return
                except OSError:
                    pass
                if time.monotonic() > deadline:
                    raise RuntimeError(f'{name} did not become ready within {timeout} seconds')
                time.sleep(0.2)

        wait_ready('http://127.0.0.1:6005/api/health', 'SQL parser', parser)
        wait_ready('http://127.0.0.1:6006/health', 'Inquiry service', inquiry)
        if stopping:
            return 0
        web = subprocess.Popen(['nginx', '-g', 'daemon off;'])
        children.append(web)
        print('Site, SQL parser, and inquiry form ready; listening on port 3000.', flush=True)
        while not stopping:
            for name, child in [('SQL parser', parser), ('Inquiry', inquiry), ('Nginx', web)]:
                if child.poll() is not None:
                    raise RuntimeError(f'{name} exited unexpectedly ({child.returncode})')
            time.sleep(0.2)
        return 0
    except Exception as error:
        print(f'Application failed: {error}', file=sys.stderr, flush=True)
        return 1
    finally:
        for child in reversed(children):
            if child.poll() is None:
                child.terminate()
        deadline = time.monotonic() + 8
        for child in children:
            try:
                child.wait(timeout=max(0.1, deadline - time.monotonic()))
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


if __name__ == '__main__':
    sys.exit(main())
