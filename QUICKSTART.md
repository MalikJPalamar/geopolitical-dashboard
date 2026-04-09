# 🚀 Quick Deploy to centaurion.me/geopolitical-lens

## One-Line Deploy

```bash
./deploy.sh [platform]
```

**Platforms**: `vps` (default), `docker`, `cloudflare`, `vercel`, `netlify`

## Prerequisites

1. **Get Anthropic API Key**: https://console.anthropic.com/
2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

## Deploy Now

### VPS/Self-Hosted (Recommended)
```bash
./deploy.sh vps
```

### Docker
```bash
./deploy.sh docker
```

### Cloudflare Pages
```bash
./deploy.sh cloudflare
```

### Vercel
```bash
./deploy.sh vercel
```

### Netlify
```bash
./deploy.sh netlify
```

## Manual Deploy

```bash
# 1. Build
npm run build

# 2. Start production server
npm run start:prod

# 3. Access at http://localhost:3001/geopolitical-lens/
```

## Full Documentation

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for:
- Detailed setup instructions
- Nginx configuration
- SSL/HTTPS setup
- Docker deployment
- Troubleshooting
- Security best practices

## Architecture

```
centaurion.me/geopolitical-lens
        |
    [Nginx] ← SSL/HTTPS
        |
[Express:3001] ← Serves /dist + /api/*
        |
    [Anthropic API] ← Claude for news/digest
```

## Health Check

```bash
curl http://localhost:3001/api/health
```

## Support

- **Issues**: https://github.com/MalikJPalamar/geopolitical-dashboard/issues
- **Main README**: [README.md](./README.md)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
