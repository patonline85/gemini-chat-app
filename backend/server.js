// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));
app.use(cors());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GENERATION_MODEL = "gemini-1.5-flash-latest";
const EMBEDDING_MODEL = "embedding-001";

let vectorStore = [];

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0, normA = 0.0, normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

app.post('/api/chat', async (req, res) => {
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API Key chưa được cấu hình.' });
    if (vectorStore.length === 0) return res.status(500).json({ error: 'Cơ sở dữ liệu kiến thức chưa được tải.' });

    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ error: 'Vui lòng cung cấp câu hỏi.' });

        const questionEmbedding = await getEmbedding(question);

        const scoredChunks = vectorStore.map(chunk => ({
            text: chunk.text,
            source: chunk.source,
            score: cosineSimilarity(questionEmbedding, chunk.embedding)
        }));

        scoredChunks.sort((a, b) => b.score - a.score);
        const topChunks = scoredChunks.slice(0, 5);

        console.log("Top chunks found:");
        topChunks.forEach((chunk, index) => {
            console.log(`  ${index + 1}. Score: ${chunk.score.toFixed(4)} (Source: ${chunk.source})`);
        });

        const relevantChunks = topChunks.filter(c => c.score > 0.72);

        if (relevantChunks.length === 0) {
            console.log("No relevant chunks found. Returning custom fallback message.");
            return res.json({ answer: "Đệ không tìm thấy khai thị, mong Sư huynh thông cảm ạ.", citations: [] });
        }

        const context = relevantChunks.map(chunk => `Trích dẫn từ file "${chunk.source}":\n${chunk.text}`).join('\n\n---\n\n');

        // PROMPT NHẬP VAI PHẬT TỬ
        const finalPrompt = `
Ngươi hãy nhập vai là một Phật tử khiêm cung, xưng là "Đệ", dùng giọng văn nhẹ nhàng, thành kính và lễ phép khi trả lời. Đệ chỉ chia sẻ những lời dạy có trong tài liệu đã được cung cấp. Không tự ý diễn giải, không thêm kiến thức ngoài.

QUY TẮC NGHIÊM NGẶT:
1. Phạm vi trả lời: Đệ chỉ dựa vào văn bản đã cung cấp bên dưới. Không sử dụng kiến thức riêng hay nguồn bên ngoài.
2. Nếu không tìm thấy câu trả lời: Đệ phải trả lời đúng một câu: "Đệ không tìm thấy khai thị, mong Sư huynh thông cảm ạ."
3. Trích dẫn: Khi có thể, hãy kết thúc câu trả lời bằng dòng trích dẫn ngắn gọn theo mẫu: (trích từ: <tên file>)

---

📚 VĂN BẢN NGUỒN:
${context}

---

❓ CÂU HỎI:
${question}

---

🙏 LỜI ĐÁP (theo vai Phật tử “Đệ”):`;

        const payload = {
            contents: [{ parts: [{ text: finalPrompt }] }],
            generationConfig: { temperature: 0.3 }
        };

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${GENERATION_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        const synthesizedAnswer = response.data.candidates[0]?.content?.parts[0]?.text || "Không nhận được câu trả lời hợp lệ từ AI.";

        const uniqueChunks = [];
        const seenTexts = new Set();
        for (const chunk of relevantChunks) {
            if (!seenTexts.has(chunk.text)) {
                uniqueChunks.push(chunk);
                seenTexts.add(chunk.text);
            }
        }

        // Tạo trích dẫn gọn đẹp
        const formattedCitations = uniqueChunks.map(c => `📌 (trích từ: ${c.source})`);

        res.json({ 
            answer: synthesizedAnswer,
            citations: formattedCitations
        });

    } catch (error) {
        console.error('Lỗi khi gọi API:', error.response ? error.response.data.error : error.message);
        res.status(500).json({ error: 'Đã có lỗi xảy ra phía server khi xử lý yêu cầu của bạn.' });
    }
});


async function startServer() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'vectors.json'), 'utf8');
        vectorStore = JSON.parse(data);
        console.log(`Đã tải thành công ${vectorStore.length} vector kiến thức.`);
    } catch (err) {
        console.error('Cảnh báo: Không thể tải file vectors.json.');
    }

    app.listen(PORT, () => {
        console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
}

startServer();
