// Minimal Discord -> Second Life relay (Node 18+)
const { Client, GatewayIntentBits, Events } = require("discord.js");
const http = require("http");

// required env
const token      = process.env.DISCORD_TOKEN;
const channelId  = process.env.CHANNEL_ID;
const slEndpoint = process.env.SL_ENDPOINT;  // LSL http-in URL
const slToken    = process.env.SL_TOKEN;     // shared secret your LSL checks

if (!token || !channelId || !slEndpoint || !slToken) {
  console.error("Missing env vars: DISCORD_TOKEN, CHANNEL_ID, SL_ENDPOINT, SL_TOKEN");
  process.exit(1);
}

// Optional health server (harmless on Zeabur; useful if a platform expects a port)
if (process.env.PORT) {
  const port = Number(process.env.PORT);
  http.createServer((req, res) => {
    if (req.url === "/healthz") { res.writeHead(200); res.end("ok"); return; }
    res.writeHead(200); res.end("running");
  }).listen(port, () => console.log("Health server on :" + port));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log("Ready as " + c.user.tag);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== channelId) return;

  const attachments = [...message.attachments.values()].map(a => a.url);
  const payload = {
    token: slToken,
    source: "discord",
    guildId: message.guildId,
    channelId: message.channelId,
    author: message.author.username,
    authorId: message.author.id,
    content: message.content || "",
    attachments,
    timestamp: message.createdTimestamp
  };

  try {
    const res = await fetch(slEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) console.error("SL POST failed. HTTP", res.status);
  } catch (err) {
    console.error("SL POST error:", err);
  }
});

client.login(token);
