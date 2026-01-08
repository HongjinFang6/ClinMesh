# Production Security Checklist

Use this checklist before deploying ClinAI to production. Each item includes the risk level and remediation steps.

## Critical (Must Fix Before Production)

- [ ] **Change Default Passwords**
  - **Risk**: HIGH - Default passwords can be found in documentation
  - **Action**: Run `./generate-secrets.sh` to generate secure passwords
  - **Verification**: `grep -E "(postgres|minioadmin|your-secret)" .env` should return nothing

- [ ] **Enable HTTPS/TLS**
  - **Risk**: HIGH - All traffic including passwords sent in plaintext
  - **Action**: Follow SSL setup in DEPLOYMENT.md
  - **Verification**: `curl -I https://yourdomain.com` returns 200, browser shows lock icon

- [ ] **Enable JWT Authentication**
  - **Risk**: HIGH - Anyone can upload models and use resources
  - **Action**: Set `ENABLE_AUTH=true` in .env
  - **Verification**: `curl http://localhost:8000/api/models/` returns 401

- [ ] **Configure CORS Properly**
  - **Risk**: MEDIUM - Can allow malicious sites to make requests
  - **Action**: Set `ALLOWED_ORIGINS=https://yourdomain.com` in .env (your actual domain)
  - **Verification**: Check CORS headers with `curl -H "Origin: https://malicious.com" https://yourdomain.com/health`

- [ ] **Configure Firewall**
  - **Risk**: HIGH - Exposes unnecessary services to internet
  - **Action**:
    ```bash
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP
    sudo ufw allow 443/tcp   # HTTPS
    sudo ufw enable
    ```
  - **Verification**: `sudo ufw status`

## High Priority (Fix Within First Week)

- [ ] **Set Environment to Production**
  - **Risk**: MEDIUM - Debug mode leaks sensitive info
  - **Action**: Set `ENVIRONMENT=production` and `DEBUG=false` in .env
  - **Verification**: API errors should not show stack traces

- [ ] **Disable SSH Password Authentication**
  - **Risk**: HIGH - Vulnerable to brute force attacks
  - **Action**:
    ```bash
    # Copy SSH key first!
    ssh-copy-id user@server
    # Then disable password auth
    sudo nano /etc/ssh/sshd_config
    # Set: PasswordAuthentication no
    sudo systemctl restart sshd
    ```
  - **Verification**: Try logging in with password (should fail)

- [ ] **Rate Limiting Enabled**
  - **Risk**: MEDIUM - API can be abused, costs spike
  - **Action**: Verify `RATE_LIMIT_ENABLED=true` in .env
  - **Verification**: Make 100 rapid requests, should get 429 error

- [ ] **File Upload Validation**
  - **Risk**: MEDIUM - Malicious files can be uploaded
  - **Action**: Check `MAX_UPLOAD_SIZE_MB` is reasonable in .env
  - **Verification**: Try uploading a large file, should be rejected

- [ ] **Set Resource Limits**
  - **Risk**: MEDIUM - Single job can consume all resources
  - **Action**: Review and adjust in .env:
    ```
    MAX_BUILD_TIME_SECONDS=1800
    MAX_INFERENCE_TIME_SECONDS=300
    MAX_INFERENCE_MEMORY_GB=4
    ```
  - **Verification**: Monitor with `docker stats`

- [ ] **Secure Database Access**
  - **Risk**: MEDIUM - Database accessible from outside
  - **Action**: Verify in docker-compose.prod.yml:
    ```yaml
    ports:
      - "127.0.0.1:5432:5432"  # Only localhost
    ```
  - **Verification**: `nmap -p 5432 your-public-ip` should show filtered/closed

- [ ] **Secure Redis Access**
  - **Risk**: MEDIUM - Redis accessible from outside
  - **Action**: Verify Redis has password and localhost-only binding
  - **Verification**: Try connecting from external IP (should fail)

- [ ] **Secure MinIO Access**
  - **Risk**: MEDIUM - Object storage exposed
  - **Action**: Verify MinIO only accessible via nginx proxy
  - **Verification**: `curl http://your-ip:9000` should fail from external network

## Important (Fix Before Public Launch)

- [ ] **Automated Backups**
  - **Risk**: MEDIUM - Data loss from hardware failure
  - **Action**: Set up daily cron job for database backups
  - **Verification**: Check `backups/` directory has recent files

- [ ] **Log Rotation**
  - **Risk**: LOW - Disk fills up with logs
  - **Action**: Already configured in docker-compose (max-size: 10m, max-file: 3)
  - **Verification**: `docker inspect <container>` shows logging config

- [ ] **Monitoring Setup**
  - **Risk**: LOW - Issues go unnoticed
  - **Action**: Set up basic monitoring (disk space, memory, CPU)
  - **Verification**: Can view metrics and get alerts

- [ ] **Security Updates**
  - **Risk**: MEDIUM - Vulnerable to known exploits
  - **Action**:
    ```bash
    sudo apt install unattended-upgrades -y
    sudo dpkg-reconfigure -plow unattended-upgrades
    ```
  - **Verification**: Check `/var/log/unattended-upgrades/`

- [ ] **Error Logging**
  - **Risk**: LOW - Hard to debug production issues
  - **Action**: Logs already configured, set up log aggregation (optional)
  - **Verification**: `docker compose -f docker-compose.prod.yml logs` shows recent activity

## Recommended (Enhanced Security)

- [ ] **Use Managed Database**
  - **Risk**: LOW - Better reliability and backups
  - **Action**: Migrate to AWS RDS, Google Cloud SQL, etc.
  - **Verification**: Update DATABASE_URL in .env

- [ ] **Use Managed Redis**
  - **Risk**: LOW - Better performance and reliability
  - **Action**: Migrate to AWS ElastiCache, etc.
  - **Verification**: Update REDIS_URL in .env

- [ ] **Content Security Policy**
  - **Risk**: LOW - Protection against XSS
  - **Action**: Already configured in nginx.conf
  - **Verification**: Check headers with browser dev tools

- [ ] **Implement IP Whitelisting**
  - **Risk**: LOW - Extra layer of protection
  - **Action**: Add to nginx.conf if needed:
    ```nginx
    allow 1.2.3.4;
    deny all;
    ```
  - **Verification**: Try accessing from non-whitelisted IP

- [ ] **Set Up WAF (Web Application Firewall)**
  - **Risk**: LOW - Protection against common attacks
  - **Action**: Use Cloudflare, AWS WAF, etc.
  - **Verification**: Check WAF dashboard for blocked requests

- [ ] **Regular Security Audits**
  - **Risk**: LOW - Catch issues before attackers do
  - **Action**: Run security scans monthly
  - **Tools**:
    - `nmap -sV your-server-ip`
    - https://www.ssllabs.com/ssltest/
    - `docker scan <image>`
  - **Verification**: Document findings and fixes

## Docker Socket Security (Known Issue)

⚠️ **CRITICAL**: Docker socket access is a known security risk in the current architecture.

- **Current Risk**: HIGH
- **Issue**: Build and inference workers have access to Docker socket, which provides root-level access to the host
- **Mitigation Options**:
  1. **Short-term**: Use in trusted environments only, restrict network access
  2. **Medium-term**: Implement Docker socket proxy with access controls
  3. **Long-term**: Redesign to use Kubernetes or managed container services

**Action Required**:
- [ ] Document this risk to users
- [ ] Implement network segmentation
- [ ] Consider moving to managed services (AWS Fargate, Google Cloud Run)

## Testing Your Security

After deployment, run these tests:

```bash
# 1. Test SSL/TLS
curl -I https://yourdomain.com
# Should return: HTTP/2 200

# 2. Test SSL grade
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
# Target: A or A+ rating

# 3. Test authentication
curl http://yourdomain.com/api/models/
# Should return: 401 Unauthorized

# 4. Test rate limiting
for i in {1..100}; do curl https://yourdomain.com/health; done
# Should eventually return: 429 Too Many Requests

# 5. Scan for open ports
nmap -p- your-server-ip
# Should only show: 22 (SSH), 80 (HTTP), 443 (HTTPS)

# 6. Test CORS
curl -H "Origin: https://malicious.com" https://yourdomain.com/api/health
# Should not include: Access-Control-Allow-Origin: https://malicious.com

# 7. Check security headers
curl -I https://yourdomain.com
# Should include:
#   X-Content-Type-Options: nosniff
#   X-Frame-Options: DENY
#   Strict-Transport-Security: max-age=31536000
```

## Incident Response Plan

If you detect a security breach:

1. **Immediate**: Take site offline
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

2. **Preserve Evidence**: Copy logs before they're rotated
   ```bash
   docker compose -f docker-compose.prod.yml logs > incident-logs-$(date +%Y%m%d).txt
   cp /var/log/nginx/* incident-logs/
   ```

3. **Assess Damage**: Check what was accessed
   ```bash
   # Check for suspicious API calls
   grep -E "(admin|root|\.\.\/)" incident-logs-*.txt

   # Check for unusual database queries
   docker compose -f docker-compose.prod.yml exec postgres psql -U clinai_user -d clinai_production -c "SELECT * FROM pg_stat_activity;"
   ```

4. **Rotate All Secrets**
   ```bash
   ./generate-secrets.sh
   ```

5. **Restore from Backup** (if data compromised)
   ```bash
   docker compose -f docker-compose.prod.yml exec -T postgres psql -U clinai_user clinai_production < backups/pre-incident.sql
   ```

6. **Document and Report**: Document what happened and how you fixed it

7. **Improve**: Update this checklist with lessons learned

## Compliance Considerations

If handling sensitive data (medical images, etc.):

- [ ] **HIPAA Compliance** (if healthcare data)
  - Business Associate Agreement (BAA) with cloud provider
  - Encrypted backups
  - Audit logging
  - Access controls

- [ ] **GDPR Compliance** (if EU users)
  - Privacy policy
  - Data retention policies
  - Right to deletion implementation
  - Data export functionality

- [ ] **SOC 2** (if enterprise customers)
  - Security policies documented
  - Regular audits
  - Incident response procedures

## Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Docker Security Best Practices**: https://docs.docker.com/engine/security/
- **FastAPI Security**: https://fastapi.tiangolo.com/tutorial/security/
- **Let's Encrypt**: https://letsencrypt.org/
- **SSL Labs**: https://www.ssllabs.com/ssltest/

---

**Last Updated**: 2026-01-08
**Review Frequency**: Monthly
**Next Review**: 2026-02-08
