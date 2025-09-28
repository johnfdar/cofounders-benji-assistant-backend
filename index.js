import 'dotenv/config';
import pkg from '@slack/bolt';
const { App, ExpressReceiver } = pkg;
import OpenAI from 'openai';

/** 1) RECEIVER + APP (Bolt v3+) **/
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET
});
const expressApp = receiver.app; // native Express app from the receiver

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

/** 2) OPENAI **/
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** 3) HEALTH + DEBUG + LOGGING ROUTES **/
expressApp.get('/', (_req, res) => res.send('Backend is running ✅'));

expressApp.get('/slack/events', (_req, res) =>
  res.send('Slack events endpoint (GET) is alive')
);

// non-secret debug flags (do not print values)
expressApp.get('/debug', (_req, res) => {
  res.json({
    has_SIGNING_SECRET: Boolean(process.env.SLACK_SIGNING_SECRET),
    has_BOT_TOKEN: Boolean(process.env.SLACK_BOT_TOKEN),
    has_OPENAI_KEY: Boolean(process.env.OPENAI_API_KEY)
  });
});

// log every incoming request
expressApp.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.url}`);
  next();
});

/** 4) PERSONA + HELPER **/
const persona = `
You are Benji, the founder’s AI management assistant.
Mission: organise information, extract tasks, summarise threads, and keep decisions crisp.
Style: bullet points first, then a short explanation. Keep replies concise and actionable.
Constraints: do not make binding decisions; ask for missing inputs; reply in threads in channels.
`;

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

/** 5) EVENTS **/
app.event('app_mention', async ({ event, client }) => {
  try {
    const reply = await llmReply(persona, event.text || '');
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
      const reply = await llmReply(persona, event.text || '');
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

/** 6) START **/
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡️ Benji service running on port ${port}`);
})();
