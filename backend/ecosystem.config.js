module.exports = {
  apps: [
    {
      name: 'timeslot',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',

      // Production environment — copy this block to a local .env or fill in values here.
      // WARNING: do not commit real secrets to source control.
      env_production: {
        NODE_ENV:   'production',
        PORT:       '3000',

        // Production origin for CORS — the URL users access the app from.
        CORS_ORIGIN: 'https://timeslot.makerspace.ca',

        // Required: set to a long random string before deploying.
        // Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
        JWT_SECRET: 'CHANGE_ME',

        // Optional: SMTP settings for cancellation emails.
        // Leave SMTP_HOST unset to use the Ethereal dev account (console preview URLs only).
        SMTP_HOST:   '',
        SMTP_PORT:   '587',
        SMTP_SECURE: 'false',   // set to 'true' for port 465
        SMTP_USER:   '',
        SMTP_PASS:   '',
        SMTP_FROM:   '"TimeSlot" <noreply@example.com>'
      }
    }
  ]
};
