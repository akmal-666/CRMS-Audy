# Email Configuration Guide - CRMS Audy Dental

## Current Issue
Emails not being sent after work item submission. This guide provides step-by-step troubleshooting.

## Prerequisites
- Domain: `audydental.com` verified in Resend
- Resend API Key: `re_WYcmgpj4_HZbKDeCidRwsnSzQ3wnaoN8v`
- Sender email: `noreply@audydental.com`

## Step 1: Verify Cloudflare Secrets

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account → Workers & Pages
3. Click on `crms-api` worker
4. Go to Settings → Variables and Secrets
5. **Verify RESEND_API_KEY is set**:
   ```
   Variable Name: RESEND_API_KEY
   Value: re_WYcmgpj4_HZbKDeCidRwsnSzQ3wnaoN8v
   Type: Secret (encrypted)
   ```

### If NOT set, add it:
```bash
wrangler secret put RESEND_API_KEY
# When prompted, paste: re_WYcmgpj4_HZbKDeCidRwsnSzQ3wnaoN8v
```

## Step 2: Check Queue Configuration

1. In Cloudflare Dashboard → Workers & Pages → `crms-api`
2. Go to Settings → Queues
3. Verify queue `crms-email-queue` is connected:
   - Producer binding: `EMAIL_QUEUE`
   - Consumer binding: enabled
   - Max batch size: 10
   - Max batch timeout: 5 seconds

### If queue missing, create it:
```bash
wrangler queues create crms-email-queue
```

## Step 3: Verify Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Check domain `audydental.com`:
   - Status should be **Verified** ✅
   - DNS records must be correctly configured

### Required DNS Records:
```
Type: TXT
Name: @
Value: [Resend verification code]

Type: MX
Name: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none;

Type: TXT  
Name: [resend-key]
Value: [DKIM key from Resend]
```

## Step 4: Check Worker Logs

1. Go to Cloudflare Dashboard → Workers & Pages → `crms-api`
2. Click **Logs** (Real-time Logs)
3. Look for these log messages when submitting a request:
   ```
   [EMAIL QUEUE] Processing batch with X messages
   [RESEND] Starting email send process
   [RESEND] RESEND_API_KEY present: true
   [RESEND] Sending email via Resend API
   [RESEND] ✅ Email sent successfully
   ```

### Common Error Messages:
- `RESEND_API_KEY not set` → Go to Step 1
- `Resend API error 403` → API key invalid, regenerate in Resend
- `Resend API error 422` → Domain not verified, go to Step 3
- `Resend API error 429` → Rate limit exceeded, wait a moment

## Step 5: Test Email Manually

Use this curl command to test Resend API directly:

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_WYcmgpj4_HZbKDeCidRwsnSzQ3wnaoN8v" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "CRMS Audy Dental <noreply@audydental.com>",
    "to": ["your-email@example.com"],
    "subject": "Test Email",
    "html": "<p>Test email from CRMS</p>"
  }'
```

**Expected response (success):**
```json
{
  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"
}
```

**Error responses:**
- `403 Forbidden` → Invalid API key
- `422 Unprocessable Entity` → Domain not verified or sender email invalid
- `429 Too Many Requests` → Rate limit

## Step 6: Deploy Updated Code

The latest code includes enhanced logging. Deploy it:

```bash
cd apps/api
pnpm run deploy
```

## Step 7: Test Full Flow

1. Log in as business_user at https://it.audydental.com
2. Go to New Request page
3. Fill the form and submit
4. Check Cloudflare Logs immediately (within 10 seconds)
5. Check your email inbox (and spam folder)
6. If manager email provided, check manager's inbox too

## Debugging Checklist

- [ ] RESEND_API_KEY is set in Cloudflare Workers secrets
- [ ] Domain `audydental.com` is verified in Resend
- [ ] DNS records for domain are correctly configured
- [ ] Queue `crms-email-queue` exists and is bound to worker
- [ ] Latest code with logging is deployed
- [ ] No errors in Cloudflare Worker logs
- [ ] Resend API responds with 200 OK
- [ ] Email appears in Resend Logs (https://resend.com/emails)

## Alternative: Check Resend Email Logs

1. Go to https://resend.com/emails
2. Check recent emails:
   - **Status: Sent** → Email sent successfully, check spam folder
   - **Status: Failed** → Click to see error details
   - **Not listed** → Email never reached Resend API

## Emergency Workaround

If emails still not working after all checks, temporarily use a different sending method:

1. Use Gmail SMTP (requires app password)
2. Use SendGrid free tier
3. Use Postmark transactional email

## Contact Support

If issue persists after all steps:
1. Resend Support: support@resend.com
2. Cloudflare Support: https://dash.cloudflare.com/support
3. Include Worker logs and error messages

## Status Indicators

### ✅ Working Correctly
```
[RESEND] ✅ Email sent successfully to user@example.com — TK2025-00123
```

### ❌ Configuration Error
```
[RESEND] ❌ RESEND_API_KEY not set — email cannot be sent
```

### ❌ API Error
```
[RESEND] ❌ Failed to send email: 422 {"message": "Domain not verified"}
```
