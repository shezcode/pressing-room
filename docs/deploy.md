# Deploying to the VPS

CI (`.github/workflows/ci.yml`) runs on every push and pull request. On `main`, once lint, unit tests, the build and Playwright pass, it pushes the image to GHCR as `ghcr.io/<owner>/<repo>` (lowercased), tagged with the commit SHA and `latest`.

CI does not deploy: the VPS only accepts SSH from the tailnet, which GitHub's runners are not on. You deploy from your own machine with `scripts/deploy.sh`. It copies `docker-compose.prod.yml` to the VPS, writes the image tag into the server's `.env`, then runs `docker compose pull` and `up -d`.

The steps below are done once, by hand. The VPS already runs Docker, Docker Compose v2 and Nginx Proxy Manager (NPM), and you reach it over SSH through the tailnet.

## 1. DNS

- [ ] Add an `A` record (and `AAAA` if the VPS has IPv6) for `pressingroom.shezcode.com` pointing at the VPS's public IP. If the domain is on Cloudflare, leave the record as DNS only, or the Let's Encrypt challenge in step 6 can fail.

## 2. SSH host

- [ ] Make sure `ssh <host> docker ps` works from your machine over the tailnet, with no password prompt. The script uses the host `willy` by default; set `DEPLOY_HOST` to use another SSH alias. The SSH user must be in the `docker` group.

## 3. NPM network name

- [ ] Find the Docker network NPM's container is on: `docker inspect <npm-container> -f '{{json .NetworkSettings.Networks}}'`. It goes into `PROXY_NETWORK` in the env file.

## 4. Deploy folder and env file

- [ ] On the VPS, as the SSH user, create `~/pressing-room` (or set `DEPLOY_DIR` to another folder relative to that user's home).
- [ ] Copy `.env.example` from the repository to `~/pressing-room/.env`, `chmod 600` it, and fill it in:
  - `PROXY_NETWORK`: the name from step 3.
  - `JWT_SECRET`: `openssl rand -hex 32`.
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEMO_CUSTOMER_EMAIL`, `DEMO_CUSTOMER_PASSWORD`: the accounts the one-click Demo sign-in uses.
  - `DEMO_MODE=true`, `ALLOWED_ORIGINS=https://pressingroom.shezcode.com`.

  `IMAGE` can stay as it is: the deploy script rewrites it on every deploy.

## 5. GHCR package and first deploy

The first CI run on `main` creates the package under your GitHub account, linked to the repository. New packages are private.

- [ ] Once that run is green, make the package public: GitHub → your profile → Packages → the package → Package settings → Change visibility → Public. Or, to keep it private, run `docker login ghcr.io -u <github-user>` on the VPS as the SSH user, with a classic token that has only `read:packages`.
- [ ] From the repository on your machine: `scripts/deploy.sh`.
- [ ] On the VPS: `docker ps` shows `pressing-room` as `healthy`, and `docker network inspect <PROXY_NETWORK>` lists it.

The container is named `pressing-room`, so no other container on the VPS may use that name.

## 6. NPM proxy host and certificate

In the NPM admin UI → Hosts → Proxy Hosts → Add Proxy Host:

- [ ] Details: domain `pressingroom.shezcode.com`, scheme `http`, forward hostname `pressing-room` (the container name), forward port `3000` (or the `PORT` in the env file). Turn on Block Common Exploits.
- [ ] SSL: Request a new SSL certificate with Let's Encrypt, then turn on Force SSL and HTTP/2 support. DNS from step 1 must already resolve, and port 80 must be reachable from the internet, or the challenge fails.
- [ ] Open `https://pressingroom.shezcode.com`: the Demo banner shows, `/api/health` returns `{"status":"ok"}`, and `/api-docs` loads.

A 502 from NPM means it can't reach the container: check that `PROXY_NETWORK` is the network NPM is on.

## 7. Nightly reset

In demo mode every start resets all data to the seed, so a restart is the reset.

- [ ] As the SSH user, `crontab -e` and add:
  ```cron
  0 4 * * * docker restart pressing-room >/dev/null 2>&1
  ```
  This runs at 04:00 in the VPS's time zone (`timedatectl` shows it).

## Updating

Once CI is green on `main`, run `scripts/deploy.sh` again. To deploy a specific build, or roll back, pass its public-repo commit SHA: `scripts/deploy.sh <sha>`.
