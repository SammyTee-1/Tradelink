import os

# Folder structure
folders = [
    "templates",
    "static/css",
    "static/js",
    "static/img",
    "backend/services",
    "backend/models",
    "backend/routes"
]

# Starter files with minimal content
files = {
    "app.py": """from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return "Tradelink backend is running!"

if __name__ == "__main__":
    app.run(debug=True)
""",

    "requirements.txt": "Flask\nfirebase-admin\nflask-cors\nrequests\napscheduler\npython-dotenv\n",

    "templates/index.html": """<!doctype html>
<html>
  <head>
    <title>Tradelink</title>
    <link rel="stylesheet" href="/static/css/style.css">
  </head>
  <body>
    <h1>Welcome to Tradelink</h1>
    <p>This is the starting point.</p>
    <script src="/static/js/script.js"></script>
  </body>
</html>
""",

    "static/css/style.css": """body { font-family: Arial, sans-serif; padding: 2rem; }""",

    "static/js/script.js": """console.log('Tradelink frontend loaded');""",

    "backend/__init__.py": "",
    "backend/services/__init__.py": "",
    "backend/models/__init__.py": "",
    "backend/routes/__init__.py": "",
}

# Create folders
for folder in folders:
    os.makedirs(folder, exist_ok=True)

# Create files
for path, content in files.items():
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("✅ Tradelink project structure created successfully!")
