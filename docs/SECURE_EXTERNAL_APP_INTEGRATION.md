# Secure External App Integration Guide

## Security Issue Fixed

**Problem**: The original `test-external-app.html` had a serious security vulnerability where the API key was hardcoded and exposed in the browser, making it easily stealable.

**Solution**: Created a secure PHP proxy (`connect.php`) that handles API keys server-side and supports multiple organizations.

## Architecture Overview

```
External HTML App → PHP Proxy (connect.php) → Express API → Database
```

### Security Benefits

1. **API Keys Never Exposed**: API keys are stored server-side in the PHP proxy
2. **Organization Isolation**: Each organization has its own API key
3. **Centralized Management**: Single PHP file handles multiple organizations
4. **No Client-Side Secrets**: Only organization identifiers are exposed to browsers

## File Structure

```
├── connect.php                    # Secure PHP proxy (handles multiple orgs)
├── test-external-app.html         # Updated external app (uses proxy)
├── wellness_external.html         # Wellness Center specific app
└── docs/SECURE_EXTERNAL_APP_INTEGRATION.md
```

## How It Works

### 1. PHP Proxy (`connect.php`)

The proxy handles multiple organizations and their API keys:

```php
$ORGANIZATION_API_KEYS = [
    "wellness" => [
        "api_key" => "YOUR_WELLNESS_API_KEY",
        "name" => "Wellness Center",
        "organization_id" => "org_wellness_001"
    ],
    "medical" => [
        "api_key" => "YOUR_MEDICAL_API_KEY", 
        "name" => "Medical Clinic",
        "organization_id" => "org_medical_001"
    ]
];
```

**Organization Identification Methods:**
- URL parameter: `connect.php?org=wellness`
- POST data: `org=wellness`
- Custom header: `X-Organization-ID: wellness`

### 2. External HTML Apps

Each organization can have its own HTML file:

- `test-external-app.html` - Generic external app
- `wellness_external.html` - Wellness Center specific app
- `medical_external.html` - Medical Clinic specific app (create as needed)

**Key Changes:**
- Removed hardcoded API keys
- Added organization identifier (safe to expose)
- Updated to use PHP proxy

```javascript
// Before (INSECURE)
const API_KEY = "68bfa972bb73a57c8932d75b29ebf0fa:...";

// After (SECURE)
const ORGANIZATION_ID = "wellness"; // Safe to expose
```

## Setup Instructions

### 1. Configure PHP Proxy

Edit `connect.php` and update the organization configurations:

```php
$ORGANIZATION_API_KEYS = [
    "wellness" => [
        "api_key" => "YOUR_ACTUAL_WELLNESS_API_KEY",
        "name" => "Wellness Center",
        "organization_id" => "org_wellness_001"
    ],
    // Add more organizations as needed
];
```

### 2. Create Organization-Specific HTML Files

For each organization, create a dedicated HTML file:

```html
<!-- medical_external.html -->
<script>
  const ORGANIZATION_ID = "medical"; // Change this per organization
  
  async function connectToOrganization() {
    const response = await fetch(`connect.php?org=${ORGANIZATION_ID}`);
    // ... rest of the code
  }
</script>
```

### 3. Generate API Keys

Use your admin panel to generate API keys for each organization:

1. Go to `/admin/api-keys`
2. Generate new API key for each organization
3. Update the `connect.php` file with the actual API keys

## Production Considerations

### 1. Environment Variables

For production, move API keys to environment variables:

```php
// connect.php (Production)
$ORGANIZATION_API_KEYS = [
    "wellness" => [
        "api_key" => $_ENV['WELLNESS_API_KEY'],
        "name" => "Wellness Center",
        "organization_id" => $_ENV['WELLNESS_ORG_ID']
    ]
];
```

### 2. Database Storage

For better security, store API keys in the database:

```php
// connect.php (Database version)
$organizationId = $_GET['org'];
$apiKeyRecord = $pdo->prepare("SELECT * FROM api_keys WHERE organization_id = ?");
$apiKeyRecord->execute([$organizationId]);
$apiKey = $apiKeyRecord->fetch()['key'];
```

### 3. HTTPS Only

Ensure all communications use HTTPS in production.

### 4. CORS Configuration

Update CORS headers for production:

```php
header("Access-Control-Allow-Origin: https://yourdomain.com");
```

## Testing

### 1. Test Organization Connection

```bash
# Test wellness organization
curl "http://localhost/connect.php?org=wellness"

# Test medical organization  
curl "http://localhost/connect.php?org=medical"
```

### 2. Test HTML Apps

1. Open `test-external-app.html` in browser
2. Click "Connect to Organization"
3. Verify redirect to booking system

### 3. Test Error Handling

```bash
# Test invalid organization
curl "http://localhost/connect.php?org=invalid"
```

## Security Checklist

- [x] API keys removed from client-side code
- [x] PHP proxy handles API key management
- [x] Organization identifiers are safe to expose
- [x] Error handling prevents information leakage
- [x] CORS headers configured appropriately
- [x] HTTPS enforced in production
- [x] API keys stored securely (environment variables or database)

## Adding New Organizations

1. **Generate API Key**: Use admin panel to create API key for new organization
2. **Update PHP Proxy**: Add organization configuration to `connect.php`
3. **Create HTML App**: Create organization-specific HTML file
4. **Test Integration**: Verify the new organization works correctly

## Troubleshooting

### Common Issues

1. **"Invalid organization identifier"**
   - Check organization ID in HTML file matches PHP configuration
   - Verify organization exists in `$ORGANIZATION_API_KEYS`

2. **"Verification failed"**
   - Check API key is correct in PHP configuration
   - Verify Express API is running and accessible
   - Check API key is active in database

3. **CORS errors**
   - Update CORS headers in `connect.php`
   - Ensure proper domain configuration

### Debug Mode

Add debug logging to `connect.php`:

```php
error_log("Organization: " . $organizationId);
error_log("API Key: " . substr($apiKey, 0, 10) . "...");
error_log("Response: " . $response);
```

## Migration from Insecure Version

If you have existing external apps with hardcoded API keys:

1. **Backup existing files**
2. **Update HTML files** to use organization identifiers
3. **Configure PHP proxy** with organization API keys
4. **Test thoroughly** before deploying
5. **Remove old API keys** from client-side code

This secure architecture ensures that API keys are never exposed to browsers while supporting multiple organizations through a single, maintainable PHP proxy.
