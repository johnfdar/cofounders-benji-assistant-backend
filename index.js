import 'dotenv/config';
import express from 'express';
import pkg from '@slack/bolt';
const { App, ExpressReceiver } = pkg;
import OpenAI from 'openai';

// 1) Receiver + Express app
const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });
const expressApp = receiver.app;

// 2) Slack app
const app = new App({ token: process.env.SLACK_BOT_TOKEN, receiver });

// 3) OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 4) Health + logging
expressApp.get('/', (_req, res) => res.send('Backend is running ✅'));
expressApp.use((req, _res, next) => { console.log(`[req] ${req.method} ${req.url}`); next(); });

// 5) Benji persona + helper
const persona = `
You are Benji, the founder’s AI management assistant.
Mission: organise information, extract tasks, summarise threads, and keep decisions crisp.
`;
async function llmReply(system, user) {
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
  });
  return r.choices?.[0]?.message?.content ?? '…';
}

// 6) Events
app.event('app_mention', async ({ event, client }) => {
  try {
    const reply = await llmReply(persona, event.text || '');
    await client.chat.postMessage({ channel: event.channel, thread_ts: event.thread_ts || event.ts, text: reply });
  } catch (e) { console.error('app_mention', e); }
});
app.event('message', async ({ event, client }) => {
  if (event.channel_type === 'im' && !event.bot_id && event.text) {
    try {
      const reply = await llmReply(persona, event.text || '');
      await client.chat.postMessage({ channel: event.channel, thread_ts: event.thread_ts || event.ts, text: reply });
    } catch (e) { console.error('dm', e); }
  }
});

// 7) Start
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡️ Benji service running on ${port}`);
})();


