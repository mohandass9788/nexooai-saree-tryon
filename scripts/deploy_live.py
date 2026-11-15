import paramiko
import os
import tarfile
import io

VPS_IP = '31.97.227.105'
VPS_USER = 'root'
VPS_PASS = 'gG2.alE#8WaQs@OANx1w'

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    connected = False
    for attempt in range(1, 4):
        try:
            print(f"Connecting to VPS {VPS_IP} (attempt {attempt})...", flush=True)
            ssh.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=30)
            connected = True
            break
        except Exception as e:
            print(f"Attempt {attempt} failed: {e}", flush=True)
            import time
            time.sleep(2)
    if not connected:
        raise RuntimeError("Failed to connect after 3 attempts")
    sftp = ssh.open_sftp()
    print("Connected via SSH and SFTP!", flush=True)

    def run_cmd(cmd):
        print(f"\n--- Running: {cmd} ---", flush=True)
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if out:
            print(out, flush=True)
        if err:
            print("[ERR]: " + err, flush=True)
        return out, err

    # 1. Upload Backend Files
    backend_files = [
        ("backend/app/core/system_settings.py", "/app/backend/app/core/system_settings.py"),
        ("backend/app/api/v1/endpoints/admin.py", "/app/backend/app/api/v1/endpoints/admin.py"),
        ("backend/app/api/v1/endpoints/tryon.py", "/app/backend/app/api/v1/endpoints/tryon.py"),
        ("backend/app/services/tryon/base.py", "/app/backend/app/services/tryon/base.py"),
        ("backend/app/services/tryon/factory.py", "/app/backend/app/services/tryon/factory.py"),
        ("backend/app/services/tryon/gemini_engine.py", "/app/backend/app/services/tryon/gemini_engine.py"),
        ("backend/app/services/tryon/mock_engine.py", "/app/backend/app/services/tryon/mock_engine.py"),
        ("backend/app/services/image/drape_renderer.py", "/app/backend/app/services/image/drape_renderer.py"),
    ]

    run_cmd("mkdir -p /tmp/backend_update")
    for local_rel, container_dest in backend_files:
        filename = os.path.basename(local_rel)
        remote_tmp = f"/tmp/backend_update/{filename}"
        print(f"Uploading {local_rel} -> {remote_tmp}...", flush=True)
        sftp.put(local_rel, remote_tmp)
        run_cmd(f"docker cp {remote_tmp} nexooai_backend:{container_dest}")

    # 2. Restart backend container
    print("\nRestarting nexooai_backend container...", flush=True)
    run_cmd("docker restart nexooai_backend")
    import time
    time.sleep(3)
    print("\nRunning backend pytest inside container...", flush=True)
    run_cmd("docker exec nexooai_backend pytest -c pytest.ini -v")

    # 3. Create frontend dist tarball and upload
    print("\nCreating frontend tarball...", flush=True)
    dist_dir = "frontend/dist/frontend/browser"
    tar_path = "scripts/frontend_dist.tar.gz"
    with tarfile.open(tar_path, "w:gz") as tar:
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dist_dir)
                tar.add(full_path, arcname=rel_path)
    
    print(f"Uploading {tar_path} to /tmp/frontend_dist.tar.gz...", flush=True)
    sftp.put(tar_path, "/tmp/frontend_dist.tar.gz")

    run_cmd("mkdir -p /tmp/frontend_extracted")
    run_cmd("rm -rf /tmp/frontend_extracted/*")
    run_cmd("tar -xzf /tmp/frontend_dist.tar.gz -C /tmp/frontend_extracted")
    run_cmd("docker exec nexooai_frontend rm -rf /usr/share/nginx/html/*")
    run_cmd("docker cp /tmp/frontend_extracted/. nexooai_frontend:/usr/share/nginx/html/")
    run_cmd("docker exec nexooai_frontend nginx -s reload || docker restart nexooai_frontend")

    # 4. Verify containers
    run_cmd("docker ps --format '{{.Names}}: {{.Status}}'")

    sftp.close()
    ssh.close()
    print("\nDeployment completed successfully!", flush=True)

if __name__ == '__main__':
    main()
