import json, os 

def cache_files_checker():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))
    cache_folder = os.path.join(PROJECT_ROOT, "cache_local")

    if not os.path.exists(cache_folder):
        os.makedirs(cache_folder)
        print(f"Created missing cache folder at: {cache_folder}")

    required_files = [
        "backend_logs.json",
        "faculty_to_email.json",
        "students_to_email.json",
    ]

    for filename in required_files:
        file_path = os.path.join(cache_folder, filename)
        if not os.path.exists(file_path):
            with open(file_path, "w") as f:
                json.dump([], f)
                print(f"Created missing cache file: {filename}")
