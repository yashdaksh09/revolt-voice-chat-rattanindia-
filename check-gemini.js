require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkFunction() {
    try {
        console.log("--- Starting Gemini Function Check ---");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-native-audio-dialog" });

        console.log("Model object created successfully.");

        if (typeof model.startDialog === 'function') {
            console.log("\nSUCCESS: model.startDialog() IS a function! ✅");
        } else {
            console.error("\nFAILURE: model.startDialog() is NOT a function. ❌");
            console.log("Type of model.startDialog:", typeof model.startDialog);
            // Let's see what functions ARE available
            console.log("Available methods on model object:", Object.keys(model));
        }
    } catch (e) {
        console.error("\nAn error occurred during the check:", e);
    }
    console.log("--- Check Complete ---");
}

checkFunction();