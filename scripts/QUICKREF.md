# Maintenance Mode Quick Reference

## Most Common Commands

```bash
# Enable maintenance mode
./scripts/maintenance.sh tmp on

# Disable maintenance mode
./scripts/maintenance.sh tmp off

# Check status
./scripts/maintenance.sh tmp status
```

## IP Whitelist Commands

```bash
# Add IPs (comma-separated)
./scripts/maintenance-mode.sh tmp whitelist-add 203.0.113.1,198.51.100.50

# Show whitelisted IPs
./scripts/maintenance-mode.sh tmp whitelist-show

# Remove IP
./scripts/maintenance-mode.sh tmp whitelist-rm 203.0.113.1

# Clear all
./scripts/maintenance-mode.sh tmp whitelist-clear
```

## Environments

- `tmp` - Temporary/Test environment
- `devel` - Development
- `produ` - Production
- `hosoy` - Hosoy environment

## Important Notes

⚠️ **After toggling maintenance mode**:

1. Wait 30-60 seconds for cache invalidation
2. Users should **hard refresh** browser:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
   - Or use Incognito/Private mode

⚠️ **Cache invalidation** is automatic but takes time to propagate globally

⚠️ **Browser caching** of 302 redirects is aggressive - users MUST hard refresh

## Troubleshooting One-Liners

```bash
# Check KVS directly
aws --profile <profile> cloudfront-keyvaluestore list-keys \
  --kvs-arn <kvs-arn>

# Check recent invalidations
aws --profile <profile> cloudfront list-invalidations \
  --distribution-id <distribution-id> --max-items 5

# Test with curl (bypasses browser cache)
curl -I "https://<cloudfront-domain>/test-$(date +%s).html"
```

## Common Issues

| Problem                               | Solution                               |
| ------------------------------------- | -------------------------------------- |
| Still showing maintenance after `off` | Hard refresh browser (Ctrl+Shift+R)    |
| Maintenance not activating            | Wait 60s, check status, verify KVS     |
| Script can't find stack               | Check environment name and AWS profile |
| IP whitelist not working              | Verify exact IP match (no CIDR ranges) |

## Manual KVS Update (Emergency Only)

```bash
# Get current ETag
ETAG=$(aws --profile <profile> cloudfront-keyvaluestore describe-key-value-store \
  --kvs-arn <kvs-arn> \
  --query 'ETag' --output text)

# Set maintenance mode
aws --profile <profile> cloudfront-keyvaluestore put-key \
  --kvs-arn <kvs-arn> \
  --key maintenance --value "false" --if-match "$ETAG"

# MUST invalidate cache after manual update
aws --profile <profile> cloudfront create-invalidation \
  --distribution-id <distribution-id> --paths "/*"
```

**⚠️ Always use the script instead of manual commands to ensure cache invalidation!**
