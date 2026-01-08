#!/bin/bash

# ================================
# ClinAI Production Deployment Script
# ================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}ClinAI Deployment Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ Do not run this script as root${NC}"
    echo "Please run as a regular user with sudo privileges"
    exit 1
fi

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Install Docker: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Install Docker Compose: sudo apt install docker-compose-plugin"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installed${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Running generate-secrets.sh..."
    chmod +x generate-secrets.sh
    ./generate-secrets.sh

    if [ ! -f .env ]; then
        echo -e "${RED}❌ Failed to create .env file${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ .env file exists${NC}"

# Check critical environment variables
echo ""
echo -e "${BLUE}Checking environment configuration...${NC}"

source .env

if [ "$SECRET_KEY" == "your-secret-key-change-in-production" ]; then
    echo -e "${RED}❌ SECRET_KEY still using default value${NC}"
    echo "Run: ./generate-secrets.sh"
    exit 1
fi
echo -e "${GREEN}✓ SECRET_KEY configured${NC}"

if [ "$POSTGRES_PASSWORD" == "postgres" ]; then
    echo -e "${RED}❌ POSTGRES_PASSWORD still using default value${NC}"
    echo "Run: ./generate-secrets.sh"
    exit 1
fi
echo -e "${GREEN}✓ Database password configured${NC}"

if [ "$ENABLE_AUTH" != "true" ]; then
    echo -e "${YELLOW}⚠ Authentication is disabled (ENABLE_AUTH=false)${NC}"
    echo "Set ENABLE_AUTH=true in .env for production"
else
    echo -e "${GREEN}✓ Authentication enabled${NC}"
fi

if [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${YELLOW}⚠ ENVIRONMENT is not set to 'production'${NC}"
    echo "Set ENVIRONMENT=production in .env"
else
    echo -e "${GREEN}✓ Environment set to production${NC}"
fi

# Check domain configuration
if [ "$DOMAIN" == "localhost" ] || [ "$DOMAIN" == "yourdomain.com" ]; then
    echo -e "${YELLOW}⚠ Domain not configured${NC}"
    echo "Update DOMAIN in .env with your actual domain"
else
    echo -e "${GREEN}✓ Domain configured: $DOMAIN${NC}"
fi

# Check nginx configuration
echo ""
echo -e "${BLUE}Checking nginx configuration...${NC}"

if grep -q "yourdomain.com" nginx/nginx.conf; then
    echo -e "${YELLOW}⚠ nginx.conf still contains 'yourdomain.com'${NC}"
    echo "Update nginx/nginx.conf with your actual domain"
else
    echo -e "${GREEN}✓ Nginx configuration updated${NC}"
fi

# Check firewall
echo ""
echo -e "${BLUE}Checking firewall...${NC}"

if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        echo -e "${GREEN}✓ UFW firewall is active${NC}"

        if ! sudo ufw status | grep -q "80"; then
            echo -e "${YELLOW}⚠ Port 80 (HTTP) not open${NC}"
            echo "Run: sudo ufw allow 80/tcp"
        fi

        if ! sudo ufw status | grep -q "443"; then
            echo -e "${YELLOW}⚠ Port 443 (HTTPS) not open${NC}"
            echo "Run: sudo ufw allow 443/tcp"
        fi
    else
        echo -e "${YELLOW}⚠ UFW firewall is not active${NC}"
        echo "Enable firewall: sudo ufw enable"
    fi
else
    echo -e "${YELLOW}⚠ UFW not installed${NC}"
fi

# Ask for deployment confirmation
echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Ready to deploy?${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
read -p "Start deployment? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml build

echo ""
echo -e "${BLUE}Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d

echo ""
echo -e "${BLUE}Waiting for services to be healthy...${NC}"
sleep 30

# Check service status
echo ""
echo -e "${BLUE}Service Status:${NC}"
docker compose -f docker-compose.prod.yml ps

# Test health endpoint
echo ""
echo -e "${BLUE}Testing health endpoint...${NC}"
if curl -f http://localhost:8000/health &> /dev/null; then
    echo -e "${GREEN}✓ API is responding${NC}"
else
    echo -e "${RED}❌ API health check failed${NC}"
    echo "Check logs: docker compose -f docker-compose.prod.yml logs api"
fi

# SSL Setup reminder
echo ""
echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "${YELLOW}================================${NC}"
echo ""
echo "1. Set up SSL certificates:"
echo "   See DEPLOYMENT.md for Let's Encrypt setup"
echo ""
echo "2. Start nginx after SSL setup:"
echo "   docker compose -f docker-compose.prod.yml up -d nginx"
echo ""
echo "3. Test your deployment:"
echo "   curl https://$DOMAIN/health"
echo ""
echo "4. View logs:"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "5. Monitor resources:"
echo "   docker stats"
echo ""
echo -e "${GREEN}Deployment started successfully!${NC}"
echo ""
