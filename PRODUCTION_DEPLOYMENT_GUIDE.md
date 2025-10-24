# Production Deployment Security Guide

## 🚨 Current Security Issue

You're running **two separate servers**:
- **Express server** (port 3000) - ✅ Secure with our fixes
- **Static file server** (port 5500) - ❌ Exposes directory listing

## ✅ Solution Options

### Option 1: Single Express Server (Recommended)

**Deploy only your Express server** which already has:
- ✅ Security middleware blocking sensitive paths
- ✅ Proper static file serving
- ✅ SPA routing
- ✅ API endpoints

**Steps:**
1. Build your React app: `npm run build` in the web directory
2. Deploy only the Express server
3. Update the logout redirect to your production domain

### Option 2: Separate Static Deployment

If you want to deploy the HTML app separately:

**For the React app:**
- Deploy to **Netlify**, **Vercel**, or **GitHub Pages**
- These platforms don't expose directory listings
- Update the logout redirect to your deployed URL

**For the Express API:**
- Deploy to **Railway**, **Render**, or **Heroku**
- Update CORS origins to include your static site domain

### Option 3: Nginx Reverse Proxy (Advanced)

Use Nginx to serve static files securely:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Serve static files
    location / {
        root /path/to/your/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests
    location /api/ {
        proxy_pass http://localhost:3000;
    }
}
```

## 🔧 Quick Fix for Development

**Stop the port 5500 server** and use only your Express server:

1. **Stop any Live Server or static file server on port 5500**
2. **Update the logout redirect** to use your Express server:

```typescript
// In apps/web/src/components/user-menu.tsx
window.location.href = "http://127.0.0.1:3000/test-external-app.html";
```

3. **Create the test file** in your Express server's static directory:
   - Create `apps/web/public/test-external-app.html`
   - Or serve it from your Express server

## 🚀 Production Deployment Steps

### For Express Server (Railway/Render/Heroku):

1. **Build the React app:**
   ```bash
   cd apps/web
   npm run build
   ```

2. **Deploy the Express server** with the built files

3. **Update environment variables:**
   ```env
   CORS_ORIGIN=https://yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   ```

### For Static Site (Netlify/Vercel):

1. **Build and deploy** your React app
2. **Deploy your Express API** separately
3. **Update CORS** to allow your static site domain

## 🔒 Security Checklist

- ✅ No directory listing exposure
- ✅ Sensitive paths blocked (403 Forbidden)
- ✅ Proper CORS configuration
- ✅ Environment variables secured
- ✅ API endpoints protected
- ✅ Static files served securely

## 📝 Environment Variables for Production

```env
# Database
DATABASE_URL=your_production_database_url

# Auth
BETTER_AUTH_SECRET=your_secret_key
BETTER_AUTH_URL=https://yourdomain.com

# CORS
CORS_ORIGIN=https://yourdomain.com

# Email
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Payment (if using)
POLAR_ACCESS_TOKEN=your_polar_token
POLAR_PRODUCT_ID=your_product_id
```

## 🎯 Recommended Approach

**Use Option 1** - Single Express server deployment:
- Simpler to manage
- Better security
- Single point of control
- Easier to scale
- No CORS issues
