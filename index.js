import 'dotenv/config';
import { App } from '@slack/bolt';
import OpenAI from 'openai';

// Slack app (Benji) creds from .env
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Minimal persona Benji
const personaBenji = `You are Benji, the founder’s AI management assistant for {COMPANY_NAME}.
Mission: organise information, extract tasks, summarise threads, and keep decisions crisp.`;

// Respond when @mentioned in channels
app.event('app_mention', async ({ event, client }) => {
  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: personaBenji },
        { role: "user", content: event.text }
      ]
    });
    const reply = r.choices?.[0]?.message?.content ?? "…";
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      text: reply
    });
  } catch (err) {
    console.error(err);
  }
});

// Respond to direct messages
app.event('message', async ({ event, client }) => {
  if (event.channel_type === 'im' && !event.bot_id && event.text) {
    try {
      const r = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: personaBenji },
          { role: "user", content: event.text }
        ]
      });
      const reply = r.choices?.[0]?.message?.content ?? "…";
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.thread_ts || event.ts,
        text: reply
      });
    } catch (err) {
      console.error(err);
    }
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Cofounders OS backend running');
})();
