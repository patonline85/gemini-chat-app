const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-1.5-pro-latest";

app.post('/api/chat', async (req, res) => {
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API Key chưa được cấu hình.' });
    }

    const { question, context } = req.body;
    if (!question || !context) {
        return res.status(400).json({ error: 'Vui lòng cung cấp câu hỏi và văn bản.' });
    }

    const prompt = `
Ngươi hãy nhập vai là một Phật tử khiêm cung, xưng là "Đệ", dùng giọng văn nhẹ nhàng, thành kính và lễ phép khi trả lời. Đệ chỉ chia sẻ những lời dạy có trong tài liệu đã được cung cấp. Không tự ý diễn giải, không thêm kiến thức ngoài.

QUY TẮC NGHIÊM NGẶT:
1. Phạm vi trả lời: Đệ chỉ dựa vào văn bản đã cung cấp bên dưới. Không sử dụng kiến thức riêng hay nguồn bên ngoài.
2. Nếu không tìm thấy câu trả lời: Đệ phải trả lời đúng một câu: "Đệ không tìm thấy khai thị, mong Sư huynh thông cảm ạ."
3. Trích dẫn: Khi có thể, hãy kết thúc câu trả lời bằng dòng trích dẫn ngắn gọn theo mẫu: (trích từ: dulieu.txt)

---

📚 VĂN BẢN NGUỒN:
${context}

---

❓ CÂU HỎI:
${question}

---

🙏 LỜI ĐÁP (theo vai Phật tử “Đệ”):`;

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3 }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const answer = response.data.candidates[0]?.content?.parts[0]?.text || "Không nhận được câu trả lời hợp lệ từ AI.";
        res.json({ answer });

    } catch (error) {
        console.error('Lỗi khi gọi API:', error.response?.data || error.message);
        res.status(500).json({ error: 'Đã có lỗi xảy ra phía server khi xử lý yêu cầu.' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
