import 'dotenv/config';
import pkg from '@slack/bolt';
const { App } = pkg;
import OpenAI from 'openai';

// Slack app (Benji) creds from environment
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Minimal Benji persona
const personaBenji = `You are Benji, the founder’s AI management assistant for {COMPANY_NAME}.
Mission: organise information, extract tasks, summarise threads, and keep decisions crisp.`;

// Helper to call OpenAI
async function llmReply(system, user) {
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });
  return r.choices?.[0]?.message?.content ?? '…';
}

// Respond when @mentioned in channels
app.event('app_mention', async ({ event, client }) => {
  try {
    const reply = await llmReply(personaBenji, event.text || '');
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      text: reply
    });
  } catch (err) {
    console.error('app_mention error', err);
  }
});

// Respond to direct messages (IM)
app.event('message', async ({ event, client }) => {
  if (event.channel_type === 'im' && !event.bot_id && event.text) {
    try {
      const reply = await llmReply(personaBenji, event.text || '');
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.thread_ts || event.ts,
        text: reply
      });
    } catch (err) {
      console.error('dm error', err);
    }
  }
});

// Start app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Cofounders OS backend running');
})();
