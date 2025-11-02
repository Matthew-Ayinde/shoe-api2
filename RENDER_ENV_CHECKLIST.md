# Render Environment Variables Checklist

Copy these EXACT values to your Render dashboard:

## ✅ Required Variables (Must Have All)

1. **NODE_ENV** = `production`

2. **PORT** = `5000`

3. **MONGODB_URI** = `mongodb+srv://matthew03:matthew03@cluster0.w3sshbp.mongodb.net/shoeApi?retryWrites=true&w=majority&appName=Cluster0`

4. **JWT_SECRET** = `+W8UB71wfn/Z1PE9qPu6pAFNatZBRF5A1vbh8j6qryc=`

5. **JWT_EXPIRE** = `7d`

6. **ADMIN_CREATION_SECRET** = `your-admin-secret-key`

7. **CLIENT_URL** = `http://localhost:3000`

8. **ADMIN_URL** = `http://localhost:3001`

9. **EMAIL_USER** = `ayindematthew2003@gmail.com`

10. **EMAIL_PASS** = `ldyelnkbqtmdqzlz`

11. **EMAIL_FROM** = `ayindematthew2003@gmail.com`

12. **CLOUDINARY_CLOUD_NAME** = `shoe-api`

13. **CLOUDINARY_API_KEY** = `586619639964868`

14. **CLOUDINARY_API_SECRET** = `i8jL21cTmdymVpQD96x1edK9fiI`

15. **STRIPE_SECRET_KEY** = `sk_test_51S9HSgIkTsHofJHD0DNekKRiLN2QPIiur6rATEoiGC3Wwt9pdqPX7y1GmcCRcZ2196eAWKFcfVjs8N7b1cw9vNLo00PrOl64l3`

16. **GOOGLE_CLIENT_ID** = `86266750003-uptcrced5gjp0756m8jk2fmkltlvf4q3.apps.googleusercontent.com`

17. **GOOGLE_CLIENT_SECRET** = `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`

18. **VAPID_PUBLIC_KEY** = `BAtyL8QQx6wXx9mkO7y3EuFXC8iK1q65-fIz5-lPDk6cnIY0MavPcGS6arbpjEhbbLSGoWlOmuOELIAdVBC6mHw`

19. **VAPID_PRIVATE_KEY** = `rh63d_3Y95b9eDmdCaW-_S0jLHe8hEhzw1St9dR1-LE`

20. **VAPID_EMAIL** = `mailto:ayindematthew2003@gmail.com`

21. **LOG_LEVEL** = `info`

22. **RATE_LIMIT_WINDOW** = `900000`

23. **RATE_LIMIT_MAX** = `100`

## ⚠️ Optional but Recommended for Redis (if you have Upstash)

24. **REDIS_URL** = `redis://localhost:6379` (or your Upstash URL)

## 📝 How to Add in Render:

1. Go to https://dashboard.render.com/
2. Click on your "shoe-store-api" service
3. Click "Environment" tab on the left
4. For each variable above:
   - Click "Add Environment Variable"
   - Enter Key (e.g., NODE_ENV)
   - Enter Value (e.g., production)
   - Click "Save"
5. After adding all, service will auto-redeploy
