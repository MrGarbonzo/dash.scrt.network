# Secret Network Dashboard + Faucet Deployment Guide

This guide covers deploying the Secret Network Dashboard and Fee Grant Faucet to secretVM using Docker Compose and GitHub Container Registry (GHCR).

## Architecture Overview

The deployment consists of two containerized services:

1. **Dashboard** (`ghcr.io/mrgarbonzo/dash.scrt.network`) - Frontend application for interacting with Secret Network
2. **Faucet** (`ghcr.io/mrgarbonzo/feegrantfaucet2.0`) - Backend API that grants fee allowances to users

Both services communicate via a Docker network and expose ports 3000 (dashboard) and 3001 (faucet).

## Prerequisites

- Docker and Docker Compose installed
- Access to secretVM (TEE environment)
- A funded Secret Network wallet (mnemonic)
- Domain configured for `dash.scrt.network` (optional but recommended)

## Initial Setup

### 1. Push Code to GitHub

Both repositories need to have the latest code pushed to trigger GHCR image builds:

```bash
# For FeeGrantFaucet2.0
cd /root/FeeGrantFaucet2.0
git add .
git commit -m "Add Docker and GitHub Actions configuration for GHCR"
git push origin main

# For dash.scrt.network
cd /root/dash.scrt.network
git add .
git commit -m "Add production Docker build and GHCR GitHub Actions"
git push origin master
```

### 2. Verify GitHub Actions

After pushing, GitHub Actions will automatically build and push Docker images to GHCR:

- FeeGrantFaucet2.0: https://github.com/MrGarbonzo/FeeGrantFaucet2.0/actions
- dash.scrt.network: https://github.com/MrGarbonzo/dash.scrt.network/actions

Images will be available at:

- `ghcr.io/mrgarbonzo/feegrantfaucet2.0:latest`
- `ghcr.io/mrgarbonzo/dash.scrt.network:latest`

### 3. Make GHCR Packages Public (One-time)

For secretVM to pull images without authentication:

1. Go to https://github.com/MrGarbonzo?tab=packages
2. Click on each package (feegrantfaucet2.0 and dash.scrt.network)
3. Click "Package settings" → "Change visibility" → "Public"

## Deployment on secretVM

### 1. Copy Deployment Files

Copy these files to your secretVM:

```bash
# From your local machine or CI/CD
scp docker-compose.yml secretvm:/opt/secret-dashboard/
scp .env.example secretvm:/opt/secret-dashboard/
```

### 2. Configure Environment

On secretVM, create your `.env` file:

```bash
cd /opt/secret-dashboard
cp .env.example .env
nano .env  # Or use your preferred editor
```

**Required configuration:**

```bash
# CRITICAL: Your funded wallet mnemonic
FAUCET_MNEMOMIC="your twelve or twenty-four word mnemonic here"

# Secret Network LCD node
LCD_NODE=https://lcd.secret.adrius.starshell.net

# Faucet wallet address (get this from your mnemonic)
VITE_FAUCET_ADDRESS=secret1your_faucet_address_here

# External faucet URL (for browser access)
# Update with your domain or IP
VITE_FAUCET_URL=https://dash.scrt.network:3001/claim
```

**To get your faucet address from mnemonic:**

```bash
# Use secretcli or any Secret Network wallet tool
secretcli keys add faucet --recover
# Enter your mnemonic when prompted
# It will output the address
```

### 3. Start Services

```bash
cd /opt/secret-dashboard

# Pull latest images
docker-compose pull

# Start services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 4. Verify Deployment

**Check dashboard:**

```bash
curl http://localhost:3000
```

**Check faucet:**

```bash
curl http://localhost:3001/claim/secret1ap26qrlp8mcq2pg6r47w43l0y8zkqm8a450s03
```

Expected faucet response:

```json
{
  "feegrant": {
    "granter": "secret1your_faucet_address",
    "grantee": "secret1ap26qrlp8mcq2pg6r47w43l0y8zkqm8a450s03",
    "allowance": {
      "@type": "/cosmos.feegrant.v1beta1.BasicAllowance",
      "spend_limit": [{ "amount": "50000", "denom": "uscrt" }],
      "expiration": "2025-11-06T14:44:16Z"
    }
  }
}
```

### 5. Configure DNS

Point `dash.scrt.network` to your secretVM IP address:

```
A     dash.scrt.network     →  YOUR_SECRETVM_IP
```

## Maintenance

### Update Images

When new code is pushed to GitHub, new images are automatically built. To deploy updates:

```bash
cd /opt/secret-dashboard
docker-compose pull
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Dashboard only
docker-compose logs -f dashboard

# Faucet only
docker-compose logs -f faucet
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart dashboard
docker-compose restart faucet
```

### Stop Services

```bash
docker-compose down
```

### Check Resource Usage

```bash
docker stats
```

## Troubleshooting

### Dashboard Not Loading

1. Check if container is running: `docker-compose ps`
2. Check logs: `docker-compose logs dashboard`
3. Verify port 3000 is accessible: `curl http://localhost:3000`
4. Check if nginx is serving files: `docker-compose exec dashboard ls /usr/share/nginx/html`

### Faucet Not Responding

1. Check container status: `docker-compose ps`
2. Check logs for errors: `docker-compose logs faucet`
3. Verify mnemonic is set: `docker-compose exec faucet env | grep FAUCET_MNEMOMIC`
4. Test LCD node connectivity: `curl https://lcd.secret.adrius.starshell.net/node_info`
5. Check wallet balance:
   ```bash
   secretcli query bank balances YOUR_FAUCET_ADDRESS --node https://lcd.secret.adrius.starshell.net
   ```

### Fee Grant Requests Failing

Common issues:

1. **Faucet wallet has insufficient funds**

   - Fund the wallet with SCRT

2. **LCD node is down or slow**

   - Try a different LCD node in `.env`

3. **CORS errors in browser**

   - Verify VITE_FAUCET_URL is correctly set
   - Check browser console for errors

4. **Wrong faucet address configured**
   - Ensure VITE_FAUCET_ADDRESS matches your actual faucet wallet

### Permission Denied for GHCR

If you get authentication errors:

1. Make packages public (see step 3 in Initial Setup)
2. Or, authenticate Docker on secretVM:
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
   ```

## Security Notes

- The `.env` file contains sensitive information (mnemonic). Keep it secure!
- secretVM's TEE environment provides hardware-level encryption for the mnemonic
- Never commit `.env` to version control
- Regularly monitor faucet wallet balance
- Set up alerts for unusual activity

## Environment Variables Reference

See `.env.example` for a complete list of configuration options.

### Critical Variables

- `FAUCET_MNEMOMIC` - Your wallet mnemonic (required)
- `LCD_NODE` - Secret Network LCD endpoint (required)
- `VITE_FAUCET_ADDRESS` - Your faucet wallet address (required)
- `VITE_FAUCET_URL` - External faucet URL for browser access (required)

### Optional Variables

- `FAUCET_AMOUNT` - Amount to grant (default: 50000 uscrt = 0.05 SCRT)
- `FAUCET_RELOAD_TIME` - Hours between grants (default: 24)
- `VITE_MIXPANEL_ENABLED` - Enable analytics (default: false)

## Support

For issues or questions:

- Dashboard: https://github.com/MrGarbonzo/dash.scrt.network/issues
- Faucet: https://github.com/MrGarbonzo/FeeGrantFaucet2.0/issues
