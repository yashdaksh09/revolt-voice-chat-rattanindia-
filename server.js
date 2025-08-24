require('dotenv').config();
const http = require("http");
const express = require("express");
const app = express();
const { WebSocketServer } = require('ws');  // import scoket
const { GoogleGenAI } = require("@google/genai");

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = 3000;

app.use(express.static("public"));

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

console.log("Server setup is complete. Waiting for connections");

wss.on("connection", async (ws) => {
    console.log("Client is connected");//create connection to server

    ws.on("message", async (message) => {
        const audioBuffer = Buffer.from(message); // Or Buffer.from(message, 'base64') if frontend sends base64

        console.log("Audio buffer length:", audioBuffer.length);
        console.log("Base64 length:", audioBuffer.toString('base64').length);

        const CHUNK_SIZE = 16000;

        for (let i = 0; i < audioBuffer.length; i += CHUNK_SIZE) {
            const chunk = audioBuffer.slice(i, i + CHUNK_SIZE);

            let retries = 0;
            const maxRetries = 5;
            const delay = ms => new Promise(res => setTimeout(res, ms));

            while (retries <= maxRetries) {
                try {
                    const response = await genAI.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: "audio/webm",
                                            data: chunk.toString('base64'),
                                        }
                                    }
                                ]
                            }
                        ]
                    });

                    if (response.candidates?.[0]?.content?.parts) {
                        const reply = response.candidates[0].content.parts[0];
                        if (reply.text) ws.send(JSON.stringify({ text: reply.text }));
                        if (reply.inlineData?.data) ws.send(reply.inlineData.data);
                    }

                    break; // success, exit retry loop

                } catch (err) {
                    if (err.status === 429 && retries < maxRetries) {
                        console.log(`Rate limit hit. Retrying in 6s... (Attempt ${retries + 1})`);
                        await delay(6000); // wait 6 seconds before retry
                        retries++;
                    } else {
                        console.log("Error processing chunk:", err);
                        break;
                    }
                }
            }
        }
    });

    ws.on("close", () => console.log("Client is disconnected"));
    ws.on("error", (err) => console.log("WebSocket Error", err));
});

server.listen(PORT, () => console.log(`Server is listening to port ${PORT}`));


