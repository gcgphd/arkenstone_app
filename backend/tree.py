import os

EXCLUDE_DIRS = {"node_modules", ".git", "__pycache__", "venv"}

def print_tree(root=".", indent=""):
    try:
        entries = sorted(os.listdir(root))
    except PermissionError:
        print(f"{indent}[Permission denied]: {root}")
        return

    for name in entries:
        path = os.path.join(root, name)
        if os.path.isdir(path):
            if name in EXCLUDE_DIRS:
                # skip entire directory and its contents
                print(f"{indent}├─ {name}/ [excluded]")
                continue
            print(f"{indent}├─ {name}/")
            print_tree(path, indent + "│   ")
        else:
            print(f"{indent}├─ {name}")

if __name__ == "__main__":
    start_path = "."  # or pass a directory path as an argument
    print(f"Directory tree for: {os.path.abspath(start_path)}\n")
    print_tree(start_path)