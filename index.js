import 'dotenv/config';
import express from 'express';
import multer from "multer";
import fs from "fs/promises";
import cors from 'cors';
import path from 'path';

import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const app = express();
const upload = multer();
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = 'gemini-2.5-flash';
async function classifyTopic(message) {
    const prompt = `
                    Tentukan apakah pesan berikut termasuk salah satu topik:
                    - IT
                    - Programming
                    - Web Development
                    - Database
                    - API
                    - Traveling
                    - Wisata

                    Jawab HANYA dengan:
                    ALLOW
                    atau
                    REJECT

                    Pesan:
                    "${message}" `;
    const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: prompt,
            config: {
                temperature: 0
            }
        });
        return response.text.trim();
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.post('/api/chat', async (req, res) => {
    try {
        let { conversation } = req.body;
        // Validasi conversation
        if (!Array.isArray(conversation)) {
            return res.status(400).json({
                error: 'Conversation must be array'
            });
        }
        // Ambil pesan terakhir user
        const latestMessage = conversation[conversation.length - 1]?.text || '';
        const classification =
            await classifyTopic(latestMessage);
            if (classification !== 'ALLOW') {
                return res.status(200).json({
                result: `
                    Maaf, saya hanya dapat membantu topik:

                    - IT
                    - Programming
                    - Web Development
                    - Database
                    - API
                    - Traveling
                    - Wisata

                    Silakan tanyakan sesuai topik tersebut. `
            });
        }
        // Batasi history agar token tidak membengkak
        conversation = conversation.slice(-10);
        const contents = conversation.map(({ role, text }) => ({
            role,
            parts: [{ text }]
        }));

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                temperature: 0.7,
                systemInstruction: `
                Anda adalah AI Assistant khusus topik:
                - IT
                - Programming
                - Web Development
                - Database
                - API
                - Traveling
                - Wisata

                Aturan:
                - Jawab hanya topik di atas
                - Jika di luar topik, tolak dengan sopan
                - Gunakan bahasa Indonesia
                - Gunakan markdown rapi
                - Gunakan heading
                - Gunakan bullet list
                - Jika coding gunakan code block
                - Hindari jawaban terlalu panjang
                - Hindari jawaban berantakan
                `
            }
        });

        res.status(200).json({
            result: response.text
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});

app.post('/generate-text', async (req, res) => {
    //console.log(req.body);
    const { prompt } = req.body;
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
        });
        res.status(200).json({ result: response.text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/generate-from-image", upload.single("image"), async (req, res) => {
    const { prompt } = req.body;
    const base64Image = req.file.buffer.toString("base64");
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt, type: "text" },
                { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
            ],
        });
        res.status(200).json({ result: response.text });
    } catch (err) {
        if (err.message.includes("503")) {
            return res.status(503).json({
                error: "Server AI sedang sibuk, coba lagi nanti"
            });
        }
        res.status(500).json({ error: err.message });
    }
    // catch(err){
    //     res.status(500).json({ error: err.message });
    // }
})

app.post("/generate-from-document", upload.single("document"), async (req, res) => {
    const { prompt } = req.body;
    const base64Document = req.file.buffer.toString("base64");
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt ?? "Tolong buat ringkasan dari dokumen berikut.", type: "text" },
                { inlineData: { data: base64Document, mimeType: req.file.mimetype } }
            ],
        });
        res.status(200).json({ result: response.text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
    const { prompt } = req.body;
    const base64Audio = req.file.buffer.toString("base64");
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt ?? "Tolong buat transkrip dari audio berikut.", type: "text" },
                { inlineData: { data: base64Audio, mimeType: req.file.mimetype } }
            ],
        });
        res.status(200).json({ result: response.text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});