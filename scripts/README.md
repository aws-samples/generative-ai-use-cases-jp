# Maintenance Mode Scripts

Comprehensive scripts for managing CloudFront maintenance mode with automatic cache invalidation.

## Quick Start

```bash
# Check current status
./scripts/maintenance-mode.sh <env> status

# Enable maintenance mode
./scripts/maintenance-mode.sh <env> on

# Disable maintenance mode
./scripts/maintenance-mode.sh <env> off
```

## Scripts Overview

### `maintenance-mode.sh` - Main Management Script

Unified script for all maintenance mode operations with automatic CloudFront cache invalidation.

#### Features

- ✅ Enable/disable maintenance mode
- ✅ Automatic CloudFront cache invalidation
- ✅ IP whitelist management
- ✅ Status checking
- ✅ Multi-environment support
- ✅ Color-coded output

## Usage

### Basic Commands

```bash
./maintenance-mode.sh <env> <command> [options]
```

**Commands**:

- `on` - Enable maintenance mode
- `off` - Disable maintenance mode
- `status` - Check current status
- `whitelist-add` - Add IP(s) to whitelist
- `whitelist-rm` - Remove IP(s) from whitelist
- `whitelist-show` - Show whitelisted IPs
- `whitelist-clear` - Clear all whitelisted IPs

**Options**:

- `--profile <name>` - AWS profile
- `--no-invalidate` - Skip cache invalidation
- `--help` - Show help

### Examples

#### Enable/Disable Maintenance Mode

```bash
# Enable maintenance mode
./maintenance-mode.sh <env> on

# Disable maintenance mode
./maintenance-mode.sh <env> off

# Use different AWS profile
./maintenance-mode.sh prod on --profile production

# Enable without cache invalidation (not recommended)
./maintenance-mode.sh <env> on --no-invalidate
```

#### Check Status

```bash
# Check current maintenance mode status
./maintenance-mode.sh <env> status
```

Output example:

```
=== Maintenance Mode Status ===
✓ Maintenance mode: DISABLED

=== IP Whitelist ===
  - 203.0.113.1
  - 198.51.100.50

=== CloudFront Distribution ===
  Distribution ID: <distribution-id>
  URL: https://<cloudfront-domain>
```

#### IP Whitelist Management

```bash
# Add single IP
./maintenance-mode.sh <env> whitelist-add 203.0.113.1

# Add multiple IPs (comma-separated)
./maintenance-mode.sh <env> whitelist-add 203.0.113.1,198.51.100.50

# Show current whitelist
./maintenance-mode.sh <env> whitelist-show

# Remove IP
./maintenance-mode.sh <env> whitelist-rm 203.0.113.1

# Clear all IPs
./maintenance-mode.sh <env> whitelist-clear
```

## How It Works

### Maintenance Mode Flow

1. **Update KVS** - Sets `maintenance` key to `"true"` or `"false"` in CloudFront KeyValueStore
2. **Invalidate Cache** - Creates CloudFront cache invalidation for all paths (`/*`)
3. **Wait for Propagation** - Changes take 30-60 seconds to propagate globally
4. **User Action** - Users may need to hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### CloudFront Function Logic

The viewer-request CloudFront Function checks:

1. **Maintenance Key** - If `maintenance = "true"`, proceed to check whitelist
2. **IP Whitelist** - If client IP is whitelisted, allow through
3. **Redirect** - Otherwise, redirect to `/maintenance.html` with HTTP 302

### Cache Invalidation

Cache invalidation is **critical** because:

- CloudFront caches responses at edge locations globally
- Without invalidation, users see old cached redirects
- Browser caching also affects visibility

The script automatically invalidates cache after every change.

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│ CloudFront Distribution                         │
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │ Viewer Request Function                │   │
│  │ - Checks KVS for maintenance mode      │   │
│  │ - Checks KVS for IP whitelist          │   │
│  │ - Redirects if maintenance ON          │   │
│  └────────────────────────────────────────┘   │
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │ KeyValueStore (KVS)                    │   │
│  │ - maintenance: "true" or "false"       │   │
│  │ - ipWhitelist: "ip1,ip2,..."           │   │
│  └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### KVS Keys

| Key           | Type   | Description                           | Example                       |
| ------------- | ------ | ------------------------------------- | ----------------------------- |
| `maintenance` | string | Enable/disable maintenance mode       | `"true"` or `"false"`         |
| `ipWhitelist` | string | Comma-separated IPs allowed to bypass | `"203.0.113.1,198.51.100.50"` |

## Troubleshooting

### Maintenance Mode Not Activating

**Problem**: Set to `"true"` but site still accessible

**Solutions**:

1. **Check KVS value**: `./maintenance-mode.sh <env> status`
2. **Wait for propagation**: 30-60 seconds after invalidation
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
4. **Verify cache invalidation**: Check AWS Console → CloudFront → Invalidations

### Maintenance Mode Not Deactivating

**Problem**: Set to `"false"` but still showing maintenance page

**Solutions**:

1. **Run invalidation**: Script does this automatically
2. **Wait for propagation**: 30-60 seconds
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R) or incognito mode
4. **Check for browser redirect cache**: Browsers aggressively cache 302 redirects

### Script Errors

**Problem**: "Could not find Web stack"

**Solution**: Verify environment name and AWS profile

```bash
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE
```

**Problem**: "Failed to update KVS"

**Solution**: ETag mismatch - retry the command (script auto-fetches current ETag)

## Best Practices

### 1. Always Use the Script

Don't manually update KVS without cache invalidation:

```bash
# ❌ BAD - Manual update without invalidation
aws cloudfront-keyvaluestore put-key ...

# ✅ GOOD - Use the script
./maintenance-mode.sh <env> on
```

### 2. Test Before Production

```bash
# Test in dev environment first
./maintenance-mode.sh dev on
# Verify maintenance page works
./maintenance-mode.sh dev off

# Then apply to production
./maintenance-mode.sh prod on
```

### 3. Whitelist Admin IPs

```bash
# Add your admin/operations team IPs
./maintenance-mode.sh <env> whitelist-add 203.0.113.1,198.51.100.50
```

### 4. Communicate with Users

When enabling maintenance mode:

1. Post advance notice to users
2. Enable maintenance mode
3. Monitor CloudWatch for errors
4. Notify when service is restored

### 5. Monitor Cache Invalidation

```bash
# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id <distribution-id> \
  --id <invalidation-id>
```

## Advanced Usage

### Different AWS Profiles per Environment

```bash
# Development
./maintenance-mode.sh dev on --profile dev-aws-profile

# Production
./maintenance-mode.sh prod on --profile prod-aws-profile
```

### Scheduled Maintenance

```bash
#!/bin/bash
# scheduled-maintenance.sh

# Enable at 2 AM
echo "Enabling maintenance mode..."
./maintenance-mode.sh prod on

# Run updates/deployments
echo "Running maintenance tasks..."
# ... your deployment commands ...

# Disable at 6 AM
echo "Disabling maintenance mode..."
./maintenance-mode.sh prod off
```

### CI/CD Integration

```yaml
# .github/workflows/maintenance.yml
name: Toggle Maintenance Mode

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment'
        required: true
        type: choice
        options:
          - dev
          - prod
      action:
        description: 'Action'
        required: true
        type: choice
        options:
          - on
          - off

jobs:
  maintenance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Toggle Maintenance Mode
        run: |
          ./scripts/maintenance-mode.sh ${{ inputs.environment }} ${{ inputs.action }}
```

## Maintenance Page Customization

The maintenance page is served from the S3 bucket and cached by CloudFront.

### Update Maintenance Page

1. **Modify HTML/CSS**:

   ```bash
   # Edit maintenance page
   vim packages/cdk/assets/maintenance/maintenance.html
   vim packages/cdk/assets/maintenance/maintenance.css
   ```

2. **Deploy via CDK**:

   ```bash
   cd packages/cdk
   npm run cdk:deploy
   ```

3. **Invalidate cache**:
   ```bash
   ./scripts/maintenance-mode.sh <env> on --no-invalidate
   aws cloudfront create-invalidation \
     --distribution-id <id> \
     --paths "/maintenance.html" "/maintenance.css"
   ```

## Security Considerations

### IP Whitelist

- ✅ Use for admin/ops team access during maintenance
- ✅ Add monitoring service IPs to prevent false alerts
- ❌ Don't rely on IP whitelist as primary security
- ❌ Don't whitelist broad IP ranges

### KVS Access

- KeyValueStore is read-only from CloudFront Functions
- Write access requires AWS credentials with proper IAM permissions
- The script uses your AWS profile credentials

### Cache Invalidation Costs

- First 1,000 invalidation paths/month are free
- Additional paths cost $0.005 per path
- Using `/*` counts as 1 path

## Reference

### AWS Resources

- **CloudFront Distribution**: Edge CDN serving your application
- **CloudFront Functions**: Lightweight functions running at edge locations
- **KeyValueStore**: Key-value storage accessible from CloudFront Functions
- **S3 Bucket**: Stores maintenance page assets

### Useful AWS CLI Commands

```bash
# List all distributions
aws cloudfront list-distributions

# Get distribution config
aws cloudfront get-distribution --id <id>

# List KVS keys
aws cloudfront-keyvaluestore list-keys \
  --kvs-arn <arn>

# Get specific key
aws cloudfront-keyvaluestore get-key \
  --kvs-arn <arn> \
  --key maintenance

# Check invalidation status
aws cloudfront list-invalidations --distribution-id <distribution-id>
```

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review CloudFront function logs (if available)
3. Check CloudFormation stack outputs
4. Verify AWS credentials and permissions
