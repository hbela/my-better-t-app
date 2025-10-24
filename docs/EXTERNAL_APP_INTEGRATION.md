# External App Integration Guide

This guide explains how to integrate your external application (HTML/JavaScript or PHP) with our multi-tenant booking system using API keys.

## Overview

Your external app's role is simple: securely identify itself using an API key and redirect users to our booking system with the correct organization context. All sign-in, sign-up, and booking functionality is handled by our existing React/Express application.

**Who can use this integration:**
- **Owners**: Access their organization's booking system
- **Providers**: Access their organization's booking system  
- **Clients**: Access the booking system for their organization
- **Admins**: Do NOT use this integration (they access the system directly)

## Getting Started

### 1. Obtain an API Key

Contact your system administrator to generate an API key for your organization. The admin will:

1. Log into the admin dashboard
2. Navigate to "Manage API Keys"
3. Generate a new API key for your organization
4. Provide you with the API key (shown only once)

### 2. API Key Format

API keys are sent in the `X-API-Key` header with all requests:

```
X-API-Key: your-api-key-here
```

## API Endpoints

There is only one endpoint for external apps - a verification endpoint that returns the organization information needed for redirecting users.

### Base URL

```
https://your-booking-app.com/api/external/
```

## Available Endpoints

### 1. Verify External App and Get Organization Info

```http
GET /api/external/verify
```

**Headers:**
```
X-API-Key: your-api-key-here
```

**Response:**
```json
{
  "organizationId": "org-123",
  "organizationName": "Acme Healthcare",
  "organizationSlug": "acme-healthcare",
  "redirectUrl": "https://your-booking-app.com/login?org=org-123&referrer=https%3A//your-external-app.com"
}
```

This endpoint:
- Verifies your API key is valid
- Returns your organization's information
- Provides a pre-built redirect URL to send users to the booking system

## Integration Examples

### HTML/JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Healthcare Portal</title>
</head>
<body>
    <div id="portal">
        <h1>Welcome to Acme Healthcare</h1>
        <p>Access your booking system to manage appointments.</p>
        
        <button onclick="redirectToBooking()">Access Booking System</button>
        
        <div id="org-info" style="display: none;">
            <h3>Organization Information</h3>
            <p id="org-name"></p>
            <p id="org-id"></p>
        </div>
    </div>

    <script>
        const API_KEY = 'your-api-key-here';
        const BASE_URL = 'https://your-booking-app.com/api/external';
        
        // Verify API key and get organization info
        async function verifyAndGetOrgInfo() {
            try {
                const response = await fetch(`${BASE_URL}/verify`, {
                    headers: {
                        'X-API-Key': API_KEY
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return data;
                } else {
                    throw new Error('Failed to verify API key');
                }
            } catch (error) {
                console.error('Error verifying API key:', error);
                alert('Failed to connect to booking system');
                return null;
            }
        }
        
        // Redirect user to booking system
        async function redirectToBooking() {
            const orgInfo = await verifyAndGetOrgInfo();
            
            if (orgInfo) {
                // Display organization info (optional)
                document.getElementById('org-name').textContent = `Organization: ${orgInfo.organizationName}`;
                document.getElementById('org-id').textContent = `ID: ${orgInfo.organizationId}`;
                document.getElementById('org-info').style.display = 'block';
                
                // Redirect to booking system with organization context
                window.location.href = orgInfo.redirectUrl;
            }
        }
        
        // Optional: Verify on page load
        window.onload = async function() {
            const orgInfo = await verifyAndGetOrgInfo();
            if (orgInfo) {
                document.title = `${orgInfo.organizationName} - Healthcare Portal`;
            }
        };
    </script>
</body>
</html>
```

### PHP Example

```php
<?php
class ExternalAppIntegration {
    private $apiKey;
    private $baseUrl;
    
    public function __construct($apiKey, $baseUrl) {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }
    
    private function makeRequest($endpoint) {
        $url = $this->baseUrl . $endpoint;
        $headers = [
            'X-API-Key: ' . $this->apiKey,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 400) {
            throw new Exception('API request failed: ' . $response);
        }
        
        return json_decode($response, true);
    }
    
    public function verifyAndGetOrgInfo() {
        return $this->makeRequest('/verify');
    }
    
    public function redirectToBooking() {
        try {
            $orgInfo = $this->verifyAndGetOrgInfo();
            
            if ($orgInfo) {
                // Redirect to booking system with organization context
                header('Location: ' . $orgInfo['redirectUrl']);
                exit();
            } else {
                throw new Exception('Failed to get organization info');
            }
        } catch (Exception $e) {
            echo "Error: " . $e->getMessage();
        }
    }
}

// Usage example
$integration = new ExternalAppIntegration(
    'your-api-key-here',
    'https://your-booking-app.com/api/external'
);

// Check if user clicked "Access Booking System"
if (isset($_GET['action']) && $_GET['action'] === 'booking') {
    $integration->redirectToBooking();
}

// Display the portal page
?>
<!DOCTYPE html>
<html>
<head>
    <title>Healthcare Portal</title>
</head>
<body>
    <h1>Welcome to Acme Healthcare</h1>
    <p>Access your booking system to manage appointments.</p>
    
    <a href="?action=booking">Access Booking System</a>
    
    <?php
    // Optional: Display organization info
    try {
        $orgInfo = $integration->verifyAndGetOrgInfo();
        if ($orgInfo) {
            echo "<div style='margin-top: 20px; padding: 10px; background: #f0f0f0;'>";
            echo "<h3>Organization Information</h3>";
            echo "<p><strong>Name:</strong> " . htmlspecialchars($orgInfo['organizationName']) . "</p>";
            echo "<p><strong>ID:</strong> " . htmlspecialchars($orgInfo['organizationId']) . "</p>";
            echo "</div>";
        }
    } catch (Exception $e) {
        echo "<p style='color: red;'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
    }
    ?>
</body>
</html>
```

## User Authentication Flow

### 1. External App Integration

When a user clicks "Access Booking System" in your external app:

1. **Verify API key**: Your external app calls `/api/external/verify` to get organization info
2. **Redirect to booking system**: User is redirected to `https://your-booking-app.com/login?org=org-123&referrer=https://your-external-app.com`
3. **User signs in**: User authenticates with their existing account or creates a new one
4. **Access booking**: User can browse and book appointments using your existing React/Express features
5. **Sign out redirect**: When user signs out, they're redirected back to your external app

### 2. User Types and Access

**Owners**: 
- Sign in with their existing owner account
- Access their organization's management features
- Can manage departments, providers, and events

**Providers**:
- Sign in with their existing provider account  
- Access their organization's provider features
- Can manage their events and view bookings

**Clients**:
- Sign in with existing account or create new one
- Access the booking system for their organization
- Can browse providers and book appointments

### 3. Organization Context

- The organization ID is automatically set from the API key
- Users are automatically associated with the correct organization
- All features work within the organization's scope

## Security Best Practices

### 1. API Key Security

- **Never expose API keys in client-side code**
- Store API keys securely on your server
- Use HTTPS for all API requests
- Rotate API keys regularly

### 2. User Data Protection

- Always validate user input
- Sanitize data before sending to API
- Use HTTPS for all communications
- Implement proper error handling

### 3. Rate Limiting

- Implement rate limiting on your side
- Handle API errors gracefully
- Cache responses when appropriate

## Error Handling

### Common Error Responses

```json
{
  "error": "API key required"
}
```

```json
{
  "error": "Invalid API key"
}
```

```json
{
  "error": "Organization not found"
}
```

```json
{
  "error": "Event not found or already booked"
}
```

### Error Codes

- `400`: Bad Request (missing required fields)
- `401`: Unauthorized (invalid or missing API key)
- `403`: Forbidden (access denied to organization)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

## Testing

### Test API Key

Contact your administrator for a test API key to use during development.

### Test Endpoints

Use the provided examples to test your integration:

1. Test organization access
2. Test department listing
3. Test provider listing
4. Test event retrieval
5. Test booking creation
6. Test user booking retrieval

## Support

For technical support or questions about integration:

1. Check this documentation first
2. Review the API responses for error details
3. Contact your system administrator
4. Check the admin dashboard for API key status

## Changelog

- **v1.0**: Initial API key integration
- **v1.1**: Added external app redirect support
- **v1.2**: Enhanced error handling and documentation
