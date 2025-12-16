# ⚠️ OpenAI API Key Issue - Quota Exceeded

## Problem

Your OpenAI API key has **run out of credits**. You're seeing this error:

```
429 You exceeded your current quota
```

## Solution

### Option 1: Add Credits (Recommended)

1. Go to **[OpenAI Platform](https://platform.openai.com/)**
2. Sign in with your account
3. Go to **Settings** → **Billing**
4. Click **Add payment method** (if not already added)
5. Click **Add credits** or **Set up auto-recharge**
6. Add at least **$5-10** to start

### Option 2: Use a Different API Key

1. Create a new OpenAI account (if you have one)
2. Get a new API key from [API Keys page](https://platform.openai.com/api-keys)
3. Update `.env` file:
   ```
   OPENAI_API_KEY=sk-your-new-key-here
   ```
4. Restart the backend

### Option 3: Use Free Tier (Limited)

OpenAI no longer offers a completely free tier, but new accounts get:
- **$5 free credits** (expires after 3 months)
- Good for ~50-100 interview questions

## How to Check Your Balance

1. Go to [platform.openai.com/usage](https://platform.openai.com/usage)
2. View your current usage
3. Check available credits

## Cost Estimation

For InterviewAce:
- **Resume Summary:** ~$0.01 per resume
- **Chat Answer:** ~$0.005-0.01 per question
- **$10 credit** = ~1000 questions

## Troubleshooting

### Error: "Quota Exceeded"
**Fix:** Add credits to your OpenAI account

### Error: "Invalid API Key"
**Fix:** Check your API key in `.env` file

### Error: "Rate Limited"
**Fix:** Wait a few minutes or upgrade to paid tier

## Alternative: Use Smaller Model (Cheaper)

Edit `.env`:
```env
# Change from gpt-4-turbo-preview to gpt-3.5-turbo (10x cheaper!)
OPENAI_MODEL=gpt-3.5-turbo
```

GPT-3.5-Turbo:
- **10x cheaper** than GPT-4
- Still very good quality
- **$10** = ~10,000 questions!

## After Adding Credits

1. Restart the backend:
   ```bash
   # Stop current backend (Ctrl+C)
   cd InterviewAce/backend
   npm run dev
   ```

2. Or restart everything:
   ```bash
   # In InterviewAce directory
   npm run dev
   ```

3. Try uploading your resume again
4. The AI features should now work!

## Need Help?

- OpenAI Billing: [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
- OpenAI Pricing: [openai.com/pricing](https://openai.com/pricing)
- API Docs: [platform.openai.com/docs](https://platform.openai.com/docs)

---

**Note:** The app still works without OpenAI credits - you just won't get AI-generated answers. The transcription (Web Speech API) is completely free and will continue to work!
