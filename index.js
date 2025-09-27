import 'dotenv/config';
import pkg from '@slack/bolt';
const { App } = pkg;
import OpenAI from 'openai';

/**
 * 1) APP SETUP
 */
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 2) HEALTH CHECK + REQUEST LOGGING (Bolt v3 uses receiver.router)
 */
app.receiver.router.get('/', (req, res) => {
  res.send('Cofounders OS backend is running ✅');
});

app.receiver.router.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.url}`);
  next();
});

/**
 * 3) MINIMAL BENJI PERSONA
 */
const personaBenji = `
You are Benji, the founder’s AI management assistant.
Mission: organise information, extract tasks, summarise threads, and keep decisions crisp.
`;

/**
 * 4) OPENAI HELPER
 */
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

/**
 * 5) SLACK HANDLERS
 */
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

/**
 * 6) START SERVER
 */
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log(⚡️ Cofounders OS backend running');
})();
