# Deploying to the VPS

CI (`.github/workflows/ci.yml`) runs on every push and pull request. On `main`, once lint, unit tests, the build and Playwright pass, it pushes the image to GHCR as `ghcr.io/<owner>/<repo>` (lowercased) tagged with the commit SHA and `latest`. It then connects to the VPS over SSH, copies `docker-compose.prod.yml` there, and runs `docker compose pull` and `up -d` with the image for that commit.

These steps are done once, by hand. The VPS already runs Docker, Docker Compose v2 and Nginx Proxy Manager (NPM).

## 1. DNS

- [ ] Add an `A` record (and `AAAA` if the VPS has IPv6) for `pressingroom.shezcode.com` pointing at the VPS.

## 2. NPM network name

- [ ] Find the Docker network NPM's container is on: `docker network ls`, or `docker inspect <npm-container> -f '{{json .NetworkSettings.Networks}}'`. It is often `npm_default`. It goes into `PROXY_NETWORK` in the env file.

## 3. Deploy user and key

- [ ] Create a dedicated user that can run Docker and nothing else it doesn't need:
  ```bash
  sudo adduser --disabled-password --gecos "" deploy
  sudo usermod -aG docker deploy
  ```
  Membership of the `docker` group is root-equivalent on the host, so this user exists only for deploys.
- [ ] On your own machine, generate a key used only by CI (no passphrase):
  ```bash
  ssh-keygen -t ed25519 -N "" -C "pressing-room-ci" -f pressing-room-deploy
  ```
- [ ] Put `pressing-room-deploy.pub` in `/home/deploy/.ssh/authorized_keys` (mode 600, directory 700, owned by `deploy`).
- [ ] Check it works: `ssh -i pressing-room-deploy deploy@<host> docker ps`.
- [ ] Record the host key for CI: `ssh-keyscan -t ed25519 <host>`, and compare its fingerprint with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the VPS.

## 4. Deploy folder and env file

- [ ] Create the folder CI deploys to, owned by the deploy user, e.g. `/home/deploy/pressing-room`.
- [ ] Copy `.env.example` from the repository to `<folder>/.env`, `chmod 600` it, and fill it in:
  - `PROXY_NETWORK`: the name from step 2.
  - `JWT_SECRET`: `openssl rand -hex 32`.
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEMO_CUSTOMER_EMAIL`, `DEMO_CUSTOMER_PASSWORD`: the accounts the one-click Demo sign-in uses.
  - `DEMO_MODE=true`, `ALLOWED_ORIGINS=https://pressingroom.shezcode.com`.
  - `IMAGE`: `ghcr.io/<owner>/<repo>:latest`, lowercased. CI overrides it with the commit's tag on each deploy; this value is what a manual `docker compose up` uses.

  CI copies `docker-compose.prod.yml` into this folder on every deploy, so there's no need to copy it now.

## 5. GHCR pull access

The package does not exist yet: the first CI run on `main` (step 7) creates it under your GitHub account, linked to the repository. Its deploy job then fails to pull the private image. Once that run has pushed the image, do one of these, then re-run the deploy job:

- [ ] Make it public: GitHub → your profile → Packages → the package → Package settings → Change visibility → Public. The VPS can then pull without logging in.
- [ ] Or, to keep it private: create a classic personal access token with only `read:packages`, and as the deploy user run `docker login ghcr.io -u <github-user>` with the token as the password.

## 6. Repository secrets

In the public repository: Settings → Secrets and variables → Actions → New repository secret.

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | The VPS hostname or IP |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | The whole private key file `pressing-room-deploy`, including the `BEGIN`/`END` lines |
| `DEPLOY_PATH` | The folder from step 4, e.g. `/home/deploy/pressing-room` |
| `DEPLOY_KNOWN_HOSTS` | The `ssh-keyscan` line from step 3 |

The GHCR push uses the workflow's own `GITHUB_TOKEN`, so it needs no secret. SSH must listen on port 22 for the deploy job.

## 7. First deploy

- [ ] Push to `main`. The run creates the GHCR package; its deploy job fails to pull until the package is readable.
- [ ] Make the package public or log in on the VPS (step 5), then re-run the deploy job and wait for it to go green.
- [ ] On the VPS: `docker ps` shows `pressing-room` as `healthy`, and `docker network inspect <PROXY_NETWORK>` lists it.

## 8. NPM proxy host and certificate

In the NPM admin UI → Hosts → Proxy Hosts → Add Proxy Host:

- [ ] Details: domain `pressingroom.shezcode.com`, scheme `http`, forward hostname `pressing-room` (the container name), forward port `3000` (or the `PORT` in the env file). Turn on Block Common Exploits.
- [ ] SSL: Request a new SSL certificate with Let's Encrypt, then turn on Force SSL and HTTP/2 support. DNS from step 1 must already resolve, or the challenge fails.
- [ ] Open `https://pressingroom.shezcode.com`: the Demo banner shows, `/api/health` returns `{"status":"ok"}`, and `/api-docs` loads.

## 9. Nightly reset

In demo mode every start resets all data to the seed, so a restart is the reset.

- [ ] As the deploy user, `crontab -e` and add:
  ```cron
  0 4 * * * docker restart pressing-room >/dev/null 2>&1
  ```
  This runs at 04:00 in the VPS's time zone (`timedatectl` shows it).
