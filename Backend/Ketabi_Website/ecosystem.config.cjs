module.exports = {
  apps: [
    {
      name: 'ketabi',
      script: './index.js', // or './app.js' if you run that
      cwd: '/home/deploy/Ketabi_Website_Fullstack/Backend/Ketabi_Website',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        CLIENT_URL: 'http://16.171.234.223',
        FRONTEND_URL: 'http://16.171.234.223',

        // DATABASE
        MONGO_URI: 'mongodb+srv://AbdelrahmanSalah:Abdelrahman%40123@ketabicluster.cqxjpr7.mongodb.net/ketabi?retryWrites=true&w=majority&appName=KetabiCluster',

        // REDIS
        REDIS_URL: 'redis://localhost:6379/0',

        // SECURITY
        SESSION_SECRET: '733b8ef01b833f3be9b908d76eeaa3cce46b3be76d82c7ee0f5d4f93b986b1c948dc8166aacc177167af133ce7a949b9848d00c5d097956ee6c09c7926bffc85',
        ENCRYPTION_KEY: '59d0b8ee4b85301b49015b2c833497562fc222f2b9c135238b30f09e77d67193',

        // JWT
        JWT_SECRET_ACCESS_KEY: 'b9b74fd739b6bd07b6af9850314e2fedf5b5ddb17256b34cc468d9c41013e806',
        JWT_SECRET_REFRESH_KEY: '1abac139072e395df037fc75eadeb4f2ba7cf905441d01422a6a5b9926d50eb',
        JWT_ACCESS_EXPIRES_IN: '1d',
        JWT_ACCESS_EXPIRES_IN_SECONDS: 86400,
        JWT_REFRESH_EXPIRES_IN: '30d',
        JWT_REFRESH_EXPIRES_IN_SECONDS: 604800,

        // EMAIL
        APP_EMAIL: 'ketabi789@gmail.com',
        APP_PASSWORD: 'bgsb nwgr aysw xvuu',

        // STRIPE
        STRIPE_SECRET_KEY: 'sk_test_51SA6w5HPCHq1d9QMKU47IvTzgdidp8iLSlqFSZqASofWPmaGBSZiDVkQJlrDe1f9VEhwIZQOgCIGwz3ufvwmcz3L00XnTjQ4Ly',
        STRIPE_WEBHOOK_SECRET: 'whsec_niiVluCBBbQAE5kzBC0XYYUJlM6fTBwd',

        // AWS S3
        AWS_ACCESS_KEY_ID: 'AKIAWFE4CFOAEDRAGQNA',
        AWS_SECRET_ACCESS_KEY: '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',
        AWS_REGION: 'eu-north-1',
        S3_BUCKET: 'ketabi-bucket',

        // OAUTH
        GOOGLE_CLIENT_ID: '115519062591-dp8beqjtdlscn5j1i1vq7aen4palro4c.apps.googleusercontent.com',
        GOOGLE_CLIENT_SECRET: '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',
        FACEBOOK_CLIENT_ID: '1981504632695551',
        FACEBOOK_CLIENT_SECRET: '5b5f5c6f5e1a4e1fbb3e2e1f4e1c3e2d3417ec071801cad786cd2b14d4c2cc51',

        // TELEGRAM
        TELEGRAM_BOT_TOKEN: '8559854213:AAFc5611-ZHD9B3F8VshK1x0-YaXR1J1H8w',

        // GEMINI AI
        GEMINI_API_KEY: 'AIzaSyDxQhWgXWAvOS87YIcxgd7m6QkP1l-8ewo',
        GEMINI_CHAT_MODEL: 'gemini-2.0-flash',
        EMBEDDING_MODEL: 'gemini-embedding-001',
        EMBEDDING_DIMENSIONS: 3072,
        VECTOR_INDEX_NAME: 'vector_index',

        // PAYMOB
        PAYMOB_INTEGRATION_ID: '5394654',
        PAYMOB_API_KEY: 'ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2TVRFd05EWTVOaXdpYm1GdFpTSTZJbWx1YVhScFlXd2lmUS44bFVpSGFlSEYyeklhTkFMd2I2V3pKSGMwRUdRWFJVelVpRHpsRlQ5VWc4NjYzb3N6VEhTSjRueFdzTnFLcFZqMjFheVpjSzRkcENNTTB6YlUtZExsdw==',
        PAYMOB_HMAC_SECRET: 'ACE73560816FAFBE36C720C3B9B258C2',
        PAYMOB_IFRAME_ID: '978302',
        PAYMOB_WEBHOOK_URL: 'http://16.171.234.223/api/orders/payment/paymob/callback',
      },
    },
  ],
};
