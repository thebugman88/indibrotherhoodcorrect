import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const LOCAL_DB_PATH = path.join("/tmp", "ibh_local_db.json");

function saveLocalLog(collectionName: string, data: any) {
  try {
    let currentStore: Record<string, any[]> = {};
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const content = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
      try {
        currentStore = JSON.parse(content);
      } catch {
        currentStore = {};
      }
    }
    if (!currentStore[collectionName]) {
      currentStore[collectionName] = [];
    }
    const newLog = {
      id: "log_" + Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      ...data,
    };
    currentStore[collectionName].push(newLog);
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(currentStore, null, 2), "utf-8");
    console.log(`[VERCEL-LOG] Saved local record in '${collectionName}' collection`);
  } catch (error) {
    console.error("[VERCEL-LOG] Error saving log:", error);
  }
}

let openaiInstance: OpenAI | null = null;
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required but missing.");
  }
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

function getPathSegments(req: VercelRequest) {
  const url = req.url || "";
  const sanitized = url.replace(/^\//, "").split("?")[0];
  const parts = sanitized.split("/").filter(Boolean);
  if (parts[0] === "api") parts.shift();
  return parts;
}

function isBrowserUA(ua: string | string[] | undefined) {
  if (!ua) return false;
  const value = Array.isArray(ua) ? ua[0] : ua;
  return /Mozilla|Chrome|Safari|Firefox|Edge|Opera/i.test(value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parts = getPathSegments(req);
  const route = parts.join("/");
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown_ip";
  const ua = req.headers["user-agent"];

  if (req.method === "GET" && route === "health") {
    return res.status(200).json({ status: "ok", era: "verified", db: "local_json_offline" });
  }

  if (req.method === "POST" && route === "gemini/generate") {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && openaiKey) {
      try {
        const { prompt, contents, config, jsonFormat = false } = req.body;
        const client = getOpenAI();
        const messages: any[] = [];

        if (contents && Array.isArray(contents)) {
          for (const item of contents) {
            const role = item.role === "model" ? "assistant" : "user";
            let contentText = "";
            if (Array.isArray(item.parts)) {
              contentText = item.parts.map((p: any) => p.text || "").join("\n");
            } else if (item.parts && typeof item.parts === "object") {
              contentText = item.parts.text || "";
            } else if (typeof item.parts === "string") {
              contentText = item.parts;
            }
            messages.push({ role, content: contentText });
          }
        } else {
          messages.push({ role: "user", content: prompt + (jsonFormat ? " (Respond strictly in valid JSON format)" : "") });
        }

        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          response_format: jsonFormat ? { type: "json_object" } : undefined,
        });

        return res.status(200).json({ text: completion.choices[0].message?.content });
      } catch (err) {
        console.error("[AI-ENGINE] Gemini-to-OpenAI fallback error:", err);
        return res.status(500).json({ error: "Failed to fallback generate content" });
      }
    }

    if (!geminiKey && !openaiKey) {
      return res.status(200).json({
        text: "Offline/Sandbox Mode: Add an OPENAI_API_KEY or GEMINI_API_KEY to your env configuration to unlock full generative capabilities.",
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey!, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
      const { prompt, model = "gemini-3.5-flash", jsonFormat = false } = req.body;
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: jsonFormat ? { responseMimeType: "application/json" } : undefined,
      });
      return res.status(200).json({ text: response.text });
    } catch (err) {
      console.error("Gemini proxy error:", err);
      return res.status(500).json({ error: "Failed to generate content" });
    }
  }

  if (req.method === "POST" && route === "openai/generate") {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!openaiKey && geminiKey) {
      try {
        const { prompt, messages = [], systemPrompt = "" } = req.body;
        const ai = new GoogleGenAI({ apiKey: geminiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
        const contents: any[] = [];

        if (systemPrompt) {
          contents.push({ role: "user", parts: [{ text: `System Instruction: ${systemPrompt}` }] });
        }
        if (messages && messages.length > 0) {
          for (const m of messages) {
            const role = m.role === "assistant" ? "model" : "user";
            contents.push({ role, parts: [{ text: m.content }] });
          }
        } else {
          contents.push({ role: "user", parts: [{ text: prompt }] });
        }

        const response = await ai.models.generateContent({ model: "gemini-3.5-flash", contents });
        return res.status(200).json({ text: response.text });
      } catch (err) {
        console.error("[AI-ENGINE] OpenAI-to-Gemini fallback error:", err);
        return res.status(500).json({ error: "Failed to fallback generate content" });
      }
    }

    if (!openaiKey && !geminiKey) {
      return res.status(200).json({
        text: "Offline Mode: Set either GEMINI_API_KEY or OPENAI_API_KEY in your env configuration to activate independent artist AI generation.",
      });
    }

    try {
      const { prompt, model = "gpt-4o-mini", messages = [], systemPrompt = "" } = req.body;
      const client = getOpenAI();
      const completion = await client.chat.completions.create({
        model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          ...(messages.length > 0 ? messages : [{ role: "user", content: prompt }]),
        ],
      });
      return res.status(200).json({ text: completion.choices[0].message?.content });
    } catch (err) {
      console.error("OpenAI proxy error:", err);
      return res.status(500).json({ error: "Failed to generate OpenAI content" });
    }
  }

  if (req.method === "POST" && route === "artist-manager/plan") {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const { artistName, goals, genre } = req.body;
    const systemPrompt = "You are the IndieBrotherhood Artist Manager, an expert in music industry strategy for independent artists. Provide a detailed 30-day rollout plan.";

    if (!openaiKey && geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nArtist: ${artistName}\nGenre: ${genre}\nGoals: ${goals}\n\nGenerate an outstanding detailed, professional, day-by-day 30-day rollout calendar and strategy.` }],
            },
          ],
        });
        return res.status(200).json({ plan: response.text });
      } catch (err) {
        console.error("[AI-ENGINE] Artist Manager Gemini fallback error:", err);
        return res.status(500).json({ error: "Artist Manager currently unavailable" });
      }
    }

    if (!openaiKey && !geminiKey) {
      return res.status(200).json({
        plan: "Offline Local Manager: Rollout planning helper is offline. Please configure your GEMINI_API_KEY or OPENAI_API_KEY to generate a customized 30-day independent rollout plan.",
      });
    }

    try {
      const client = getOpenAI();
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Artist: ${artistName}\nGenre: ${genre}\nGoals: ${goals}\n\nGenerate a rollout calendar.` },
        ],
      });
      return res.status(200).json({ plan: completion.choices[0].message?.content });
    } catch (err) {
      console.error("Artist Manager error:", err);
      return res.status(500).json({ error: "Artist Manager currently unavailable" });
    }
  }

  if (req.method === "GET" && route === "keys/exposed.json") {
    saveLocalLog("Captured_Threat_DNA", {
      ip,
      userAgent: ua,
      event: "HoneyPot Access",
      trapType: "Fake Credentials File",
    });

    await new Promise((resolve) => setTimeout(resolve, 6000));

    return res.status(200).json({
      AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
      AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      GEMINI_API_KEY: "AIzaSy_HONEYPOT_TRAP_YOUR_IP_IS_LOGGED",
      STRIPE_SECRET: "sk_live_HONEYPOT_NO_MONEY_FOR_YOU",
    });
  }

  if (req.method === "GET" && parts[0] === "v1" && parts[1] === "vault" && parts.length >= 3) {
    const vaultId = parts[2];
    console.log(`[SPIDER-TRAP] Bot detected. IP: ${ip}. Trapped in door: ${vaultId}`);

    const delay = Math.floor(Math.random() * 5000) + 5000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    saveLocalLog("Captured_Threat_DNA", {
      ip,
      userAgent: ua,
      headers: req.headers,
      trapId: vaultId,
      navigationPattern: "recursive_vault",
      status: "trapped",
    });

    const nextId = Math.random().toString(36).substring(7);
    return res.status(200).json({
      status: "SUCCESS",
      vault_entry: vaultId,
      timestamp: Date.now(),
      authorized: true,
      license: "Commercial - $0.01/req billed per IBH terms",
      contents: [
        { title: "Ghost in the Machine", artist: "Anon Bot", bitrate: "320kbps", hash: "0x" + Math.random().toString(16).slice(2) },
        { title: "Recursive Nightmare", artist: "Crawler King", bitrate: "VBR", hash: "0x" + Math.random().toString(16).slice(2) },
        { title: "Indie Sovereign", artist: "Brotherhood Elite", bitrate: "Lossless", hash: "0x" + Math.random().toString(16).slice(2) },
      ],
      next_directory: `/api/v1/vault/${nextId}?auth=valid&depth=${parseInt((req.query.depth as string) || "0", 10) + 1}`,
    });
  }

  if (req.method === "POST" && route === "security/consent") {
    const { type, metadata } = req.body;
    saveLocalLog("Consent_Audit_Logs", {
      ip,
      userAgent: ua,
      type: type || "commercial_licensing",
      metadata: metadata || {},
    });
    return res.status(200).json({ success: true, message: "Consent Logged Offline to Local Audit Trail" });
  }

  res.status(404).json({ error: "Not found" });
}
