# ClinAI Production Deployment Guide

Complete guide to deploying ClinAI securely on a production server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Security Hardening Checklist](#security-hardening-checklist)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [SSL/HTTPS Setup](#sslhttps-setup)
5. [Monitoring and Maintenance](#monitoring-and-maintenance)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements

- **OS**: Ubuntu 22.04 LTS (recommended) or similar Linux distribution
- **CPU**: 4+ cores
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 100GB+ SSD
- **Network**: Static IP address and domain name

### Software Requirements

- Docker 24.0+
- Docker Compose v2.0+
- Git
- curl, wget

### Domain Setup

1. Purchase a domain name (e.g., from Namecheap, Google Domains)
2. Point DNS A record to your server's IP address
3. Wait for DNS propagation (can take 24-48 hours)

---

## Security Hardening Checklist

Before deploying, ensure all items are completed:

### Critical (MUST DO)

- [ ] Change all default passwords
- [ ] Generate secure SECRET_KEY
- [ ] Enable HTTPS/SSL with Let's Encrypt
- [ ] Enable JWT authentication (`ENABLE_AUTH=true`)
- [ ] Configure firewall (UFW or iptables)
- [ ] Set up SSH key authentication (disable password auth)
- [ ] Configure domain name and DNS

### Important (SHOULD DO)

- [ ] Enable rate limiting
- [ ] Configure file upload validation
- [ ] Set resource limits (CPU, memory)
- [ ] Enable automated backups
- [ ] Set up monitoring (logs, metrics)
- [ ] Configure CORS for your domain only

### Recommended (NICE TO HAVE)

- [ ] Use managed database (RDS, etc.) instead of Docker PostgreSQL
- [ ] Use managed Redis (ElastiCache, etc.)
- [ ] Set up log aggregation (ELK stack, Papertrail)
- [ ] Configure email notifications
- [ ] Set up automated security updates

---

## Step-by-Step Deployment

### Step 1: Provision a Server

#### Option A: AWS EC2

```bash
# Launch Ubuntu 22.04 LTS instance
# Instance type: t3.large (4 vCPU, 8GB RAM) or larger
# Storage: 100GB gp3 SSD
# Security Group: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
```

#### Option B: DigitalOcean Droplet

```bash
# Create Droplet with:
# - Ubuntu 22.04 LTS
# - 4GB RAM or larger
# - 100GB storage
# - Enable monitoring
```

#### Option C: Your Own Server

Ensure Ubuntu 22.04 LTS is installed with root access.

---

### Step 2: Initial Server Setup

SSH into your server:

```bash
ssh root@your-server-ip
```

Update system packages:

```bash
apt update && apt upgrade -y
```

Create a non-root user:

```bash
adduser clinai
usermod -aG sudo clinai
usermod -aG docker clinai  # Add to docker group (after Docker install)
```

Set up SSH key authentication:

```bash
# On your local machine:
ssh-copy-id clinai@your-server-ip

# On server, disable password authentication:
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

Configure firewall:

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

---

### Step 3: Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version

# Log out and back in for group changes to take effect
exit
ssh clinai@your-server-ip
```

---

### Step 4: Clone Repository

```bash
# Clone your repository
git clone https://github.com/yourusername/ClinAI.git
cd ClinAI

# Or upload files via SCP:
# scp -r /path/to/ClinAI clinai@your-server-ip:~/
```

---

### Step 5: Generate Secure Secrets

```bash
# Make the script executable
chmod +x generate-secrets.sh

# Run the secret generator
./generate-secrets.sh

# Enter your domain name when prompted
# Example: clinai.example.com
```

This creates a `.env` file with:
- Secure random passwords for PostgreSQL, Redis, MinIO
- 64-byte SECRET_KEY for JWT
- Your domain configuration

**IMPORTANT**: Save these credentials securely! You'll need them if you ever need to connect directly to the database or MinIO.

---

### Step 6: Review and Customize .env File

```bash
nano .env
```

Key settings to verify/update:

```bash
# Verify your domain
DOMAIN=yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Enable authentication in production
ENABLE_AUTH=true

# Set environment to production
ENVIRONMENT=production
DEBUG=false

# Adjust resource limits based on your server
MAX_UPLOAD_SIZE_MB=500
MAX_BUILD_TIME_SECONDS=1800
MAX_INFERENCE_TIME_SECONDS=300

# Optional: Configure email for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

### Step 7: Update Nginx Configuration

```bash
# Edit nginx config with your actual domain
nano nginx/nginx.conf
```

Replace `yourdomain.com` with your actual domain in these lines:

```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

---

### Step 8: Build and Start Services

```bash
# Build Docker images
docker compose -f docker-compose.prod.yml build

# Start services (initial start without nginx for SSL setup)
docker compose -f docker-compose.prod.yml up -d postgres redis minio registry api build-worker inference-worker

# Check service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

Wait for all services to be healthy (30-60 seconds).

---

## SSL/HTTPS Setup

### Option A: Let's Encrypt (Recommended - Free)

#### Step 1: Initial Certificate Request

First, we need to get certificates before starting nginx with SSL:

```bash
# Create directories for certbot
mkdir -p certbot/conf certbot/www

# Get initial certificate (HTTP-01 challenge)
# This requires port 80 to be accessible
docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --preferred-challenges http \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com \
  -d www.yourdomain.com
```

Replace:
- `your-email@example.com` with your email
- `yourdomain.com` with your actual domain

#### Step 2: Start Nginx with SSL

```bash
# Now start nginx with SSL configured
docker compose -f docker-compose.prod.yml up -d nginx

# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx
```

#### Step 3: Set Up Auto-Renewal

Certificates expire after 90 days. Set up automatic renewal:

```bash
# Test renewal (dry run)
docker compose -f docker-compose.prod.yml exec certbot certbot renew --dry-run

# Certbot container in docker-compose will auto-renew every 12 hours
```

### Option B: Custom SSL Certificate

If you have your own SSL certificate:

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your certificate files
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/

# Update nginx.conf to point to these files:
# ssl_certificate /etc/nginx/ssl/fullchain.pem;
# ssl_certificate_key /etc/nginx/ssl/privkey.pem;
```

---

### Step 9: Verify Deployment

1. **Check HTTPS**: Visit `https://yourdomain.com`
   - You should see the ClinAI landing page
   - Browser should show secure lock icon

2. **Test API**:
   ```bash
   curl https://yourdomain.com/health
   # Should return: {"status":"healthy"}
   ```

3. **Register a User**:
   ```bash
   curl -X POST https://yourdomain.com/api/users/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "email": "test@example.com",
       "password": "SecurePass123!"
     }'
   ```

4. **Check Rate Limiting**:
   ```bash
   # Make multiple requests quickly
   for i in {1..10}; do
     curl https://yourdomain.com/health
   done
   # Should eventually return 429 (rate limit exceeded)
   ```

5. **Test SSL Grade**:
   Visit https://www.ssllabs.com/ssltest/ and test your domain
   - Target: A or A+ rating

---

## Monitoring and Maintenance

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f build-worker
docker compose -f docker-compose.prod.yml logs -f inference-worker

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

### Database Backups

```bash
# Create backup directory
mkdir -p backups

# Manual backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U clinai_user clinai_production > backups/db_$(date +%Y%m%d_%H%M%S).sql

# Automated daily backups (add to crontab)
crontab -e
# Add this line:
# 0 2 * * * cd /home/clinai/ClinAI && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U clinai_user clinai_production > backups/db_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

### MinIO Data Backup

```bash
# Backup MinIO data
docker compose -f docker-compose.prod.yml exec minio mc mirror /data /backup/minio_$(date +%Y%m%d)
```

### System Resource Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop -y

# View resource usage
docker stats

# Check disk space
df -h

# Monitor logs in real-time
tail -f /var/log/syslog
```

### Update Application

```bash
# Pull latest changes
cd ~/ClinAI
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Check for issues
docker compose -f docker-compose.prod.yml logs -f
```

### Security Updates

```bash
# Enable automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades

# Manual updates
sudo apt update && sudo apt upgrade -y
```

---

## Troubleshooting

### Issue: Services Won't Start

```bash
# Check what's using the ports
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :5432

# Check Docker status
sudo systemctl status docker

# Check service logs
docker compose -f docker-compose.prod.yml logs
```

### Issue: SSL Certificate Errors

```bash
# Check certificate files exist
ls -la certbot/conf/live/yourdomain.com/

# Test nginx configuration
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Regenerate certificate
docker compose -f docker-compose.prod.yml down nginx
# Follow SSL setup steps again
```

### Issue: Database Connection Errors

```bash
# Check PostgreSQL is running
docker compose -f docker-compose.prod.yml ps postgres

# Check database logs
docker compose -f docker-compose.prod.yml logs postgres

# Connect to database manually
docker compose -f docker-compose.prod.yml exec postgres psql -U clinai_user -d clinai_production
```

### Issue: Rate Limiting Not Working

```bash
# Check Redis is running
docker compose -f docker-compose.prod.yml ps redis

# Test Redis connection
docker compose -f docker-compose.prod.yml exec redis redis-cli -a ${REDIS_PASSWORD} ping

# Check rate limit logs
docker compose -f docker-compose.prod.yml logs api | grep rate
```

### Issue: High CPU/Memory Usage

```bash
# Check resource usage
docker stats

# Limit container resources in docker-compose.prod.yml:
# deploy:
#   resources:
#     limits:
#       cpus: '2'
#       memory: 4G

# Restart with new limits
docker compose -f docker-compose.prod.yml up -d
```

### Issue: Build Worker Failing

```bash
# Check Docker socket access
docker compose -f docker-compose.prod.yml exec build-worker docker ps

# Check build logs
docker compose -f docker-compose.prod.yml logs build-worker

# Restart build worker
docker compose -f docker-compose.prod.yml restart build-worker
```

---

## Performance Optimization

### Enable HTTP/2

Already enabled in nginx.conf:
```nginx
listen 443 ssl http2;
```

### Enable Caching

Nginx is configured to cache static assets for 1 year.

### Scale Workers

```bash
# Edit docker-compose.prod.yml
# Increase concurrency for inference-worker:
# command: celery ... --concurrency=4

# Restart services
docker compose -f docker-compose.prod.yml up -d
```

### Use Managed Services (Recommended for Scale)

For better performance and reliability:

1. **Database**: Migrate to AWS RDS, Google Cloud SQL
2. **Redis**: Use AWS ElastiCache, Google Memorystore
3. **Storage**: Use AWS S3 instead of MinIO
4. **Registry**: Use AWS ECR, Google GCR

Update `.env` with managed service URLs:
```bash
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/dbname
REDIS_URL=redis://:pass@elasticache-endpoint:6379/0
```

---

## Cost Estimation

### AWS EC2 Deployment

- **t3.large** (4 vCPU, 8GB RAM): ~$60/month
- **100GB EBS Storage**: ~$10/month
- **Data Transfer**: ~$9/GB outbound
- **Total**: ~$70-100/month (low traffic)

### DigitalOcean Deployment

- **4GB Droplet**: $24/month
- **100GB Storage**: $10/month
- **Bandwidth**: 4TB included
- **Total**: ~$34/month

### Additional Costs (Optional)

- Domain name: $10-15/year
- Managed PostgreSQL: $15-50/month
- Managed Redis: $15-50/month
- Backups: $5-20/month

---

## Next Steps

1. ✅ Complete deployment following this guide
2. ✅ Test all functionality (register, upload model, run inference)
3. ✅ Set up monitoring and alerts
4. ✅ Configure automated backups
5. ✅ Document any custom configurations
6. ⚠️ Consider penetration testing before handling sensitive data
7. ⚠️ Review and address Docker socket security concerns
8. ⚠️ Implement user quotas and billing if running as a service

---

## Security Incident Response

If you suspect a security breach:

1. **Immediately**: Take the site offline
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

2. **Investigate**: Check logs for suspicious activity
   ```bash
   grep "POST /api" logs/* | grep -E "(\.\.\/|admin|root)"
   ```

3. **Rotate Secrets**: Generate new passwords and SECRET_KEY
   ```bash
   ./generate-secrets.sh
   ```

4. **Restore from Backup**: If data was compromised
   ```bash
   # Restore database
   docker compose -f docker-compose.prod.yml exec -T postgres psql -U clinai_user clinai_production < backups/latest.sql
   ```

5. **Notify Users**: If user data was potentially accessed

6. **Update and Restart**: Ensure all security patches applied
   ```bash
   sudo apt update && sudo apt upgrade -y
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

---

## Support and Resources

- **Documentation**: See README.md for API documentation
- **GitHub Issues**: Report bugs and request features
- **Security Issues**: Email security@yourdomain.com (set up dedicated email)
- **Community**: Join Discord/Slack (if available)

---

**Congratulations! Your ClinAI platform is now securely deployed in production! 🎉**
