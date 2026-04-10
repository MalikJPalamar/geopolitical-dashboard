# Deployment Guide: centaurion.me/geopolitical-lens

This guide covers deploying the Geopolitical Intelligence Dashboard to **centaurion.me/geopolitical-lens**.

## Prerequisites

1. **Anthropic API Key**: Required for Claude API access
   - Get from: https://console.anthropic.com/
   - Must have access to `claude-sonnet-4-6`

2. **Domain Setup**: centaurion.me configured with your hosting provider

3. **Node.js 18+** installed locally for building

---

## Quick Deploy Options

### Option 1: VPS/Self-Hosted (Recommended for Full Control)

Best for: Deploying to your own server with full control

**1. Build the application:**
```bash
# Set environment variables
export NODE_ENV=production

# Install dependencies
npm install

# Build the frontend
npm run build
```

**2. Configure environment:**
```bash
# Create .env file on your server
cat > .env << 'EOF'
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3001
NODE_ENV=production
BASE_PATH=/geopolitical-lens
EOF
```

**3. Deploy to your server:**
```bash
# Copy files to your server
rsync -avz --exclude node_modules --exclude .git ./ user@centaurion.me:/var/www/geopolitical-lens/

# SSH into server
ssh user@centaurion.me

# Navigate to app directory
cd /var/www/geopolitical-lens

# Install production dependencies
npm ci --production

# Start with PM2 (process manager)
pm2 start server/index.js --name geopolitical-lens
pm2 save
```

**4. Configure Nginx reverse proxy:**
```nginx
# /etc/nginx/sites-available/centaurion.me
server {
    listen 80;
    server_name centaurion.me;

    location /geopolitical-lens/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site and reload nginx
sudo ln -s /etc/nginx/sites-available/centaurion.me /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Option 2: Cloudflare Pages + Workers

Best for: Static site with serverless API functions

**1. Build the application:**
```bash
npm run build
```

**2. Deploy via Wrangler CLI:**
```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler pages deploy dist --project-name=geopolitical-lens
```

**3. Set environment variables in Cloudflare Dashboard:**
- Go to: Workers & Pages → geopolitical-lens → Settings → Environment variables
- Add: `ANTHROPIC_API_KEY` = your-key-here
- Add: `NODE_ENV` = production
- Add: `BASE_PATH` = /geopolitical-lens

**4. Configure custom domain:**
- In Cloudflare Pages → Custom domains
- Add: `centaurion.me/geopolitical-lens`

---

### Option 3: Vercel

Best for: Quick deployment with automatic CI/CD

**1. Install Vercel CLI:**
```bash
npm install -g vercel
```

**2. Deploy:**
```bash
vercel --prod
```

**3. Configure in Vercel dashboard:**
- Go to: Project Settings → Environment Variables
- Add: `ANTHROPIC_API_KEY` = your-key-here
- Go to: Project Settings → Domains
- Add: `centaurion.me` with path `/geopolitical-lens`

---

### Option 4: Netlify

Best for: Simple static site hosting with functions

**1. Install Netlify CLI:**
```bash
npm install -g netlify-cli
```

**2. Deploy:**
```bash
netlify deploy --prod
```

**3. Configure:**
- Go to: Site Settings → Environment Variables
- Add: `ANTHROPIC_API_KEY` = your-key-here
- Go to: Domain Settings → Add custom domain
- Configure: `centaurion.me/geopolitical-lens`

---

## Docker Deployment

For containerized deployment:

**Create Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
```

**Build and run:**
```bash
docker build -t geopolitical-lens .
docker run -d \
  -p 3001:3001 \
  -e ANTHROPIC_API_KEY=your-key-here \
  -e BASE_PATH=/geopolitical-lens \
  --name geopolitical-lens \
  geopolitical-lens
```

---

## Production Checklist

- [ ] Anthropic API key configured
- [ ] Environment set to `production`
- [ ] BASE_PATH set to `/geopolitical-lens`
- [ ] Frontend built with `npm run build`
- [ ] Server serving static files from `/dist`
- [ ] Reverse proxy configured (Nginx/Apache)
- [ ] SSL/TLS certificate installed (Let's Encrypt)
- [ ] Process manager configured (PM2/systemd)
- [ ] Health endpoint accessible: `/api/health`
- [ ] CORS properly configured for your domain
- [ ] Firewall rules allow port 3001 (or your PORT)

---

## Testing Production Build Locally

Before deploying:

```bash
# Build
npm run build

# Set environment
export NODE_ENV=production
export BASE_PATH=/geopolitical-lens

# Start server
node server/index.js

# Test endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/market
```

Open: `http://localhost:3001/geopolitical-lens/`

---

## Troubleshooting

**Issue: "No API key found"**
- Ensure `ANTHROPIC_API_KEY` is set in `.env` or environment variables
- Verify the key starts with `sk-ant-`

**Issue: "404 on /api/* routes"**
- Check that server is running on the correct PORT
- Verify reverse proxy configuration
- Check that `/api` routes are not blocked by firewall

**Issue: "White screen after deployment"**
- Check browser console for errors
- Verify `base` path in `vite.config.js` matches deployment path
- Ensure all assets load correctly (check Network tab)

**Issue: "CORS errors"**
- Server already has CORS enabled via `cors()` middleware
- If using reverse proxy, ensure headers are passed through
- Check that API domain matches frontend domain

---

## Monitoring & Maintenance

**Health check endpoint:**
```bash
curl https://centaurion.me/geopolitical-lens/api/health
```

**PM2 monitoring (if using PM2):**
```bash
pm2 status
pm2 logs geopolitical-lens
pm2 monit
```

**Update deployment:**
```bash
# On local machine
git pull origin main
npm run build

# Copy to server
rsync -avz --exclude node_modules dist/ user@centaurion.me:/var/www/geopolitical-lens/dist/

# Restart server
pm2 restart geopolitical-lens
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Claude API key from Anthropic |
| `PORT` | No | 3001 | Server port |
| `NODE_ENV` | No | development | Set to `production` for production |
| `BASE_PATH` | No | '' | Subpath for deployment (e.g., `/geopolitical-lens`) |

---

## Security Notes

1. **Never commit `.env`** - Already in `.gitignore`
2. **Use HTTPS in production** - Configure SSL certificate
3. **Rotate API keys regularly** - Update in deployment environment
4. **Rate limit API endpoints** - Consider adding rate limiting middleware
5. **Monitor API usage** - Check Anthropic dashboard for costs

---

## Support

- **Dashboard issues**: https://github.com/MalikJPalamar/geopolitical-dashboard/issues
- **Anthropic API**: https://docs.anthropic.com/
- **Vite documentation**: https://vitejs.dev/
- **Express.js**: https://expressjs.com/

---

## Architecture Diagram

```
                                    centaurion.me
                                         |
                                    [Nginx/SSL]
                                         |
                            /geopolitical-lens/
                                    /    |    \
                                   /     |     \
                          /api/*  /      |      \  static files
                                /        |        \
                               /    [Express]      \
                              /    (port 3001)      \
                             /          |            \
                    [Anthropic]   [Yahoo Finance]   [React SPA]
                    Claude API      Frankfurter        (dist/)
                                       FX API
```
