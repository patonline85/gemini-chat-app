const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct';  // ✅ Dùng Mistral

app.post('/api/chat', async (req, res) => {
    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'OPENROUTER_API_KEY chưa được cấu hình.' });
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
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: OPENROUTER_MODEL,
                messages: [
                    {
                        role: "system",
                        content: "Bạn là một Phật tử tên Đệ, trả lời như hướng dẫn."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://pmtl.site',
                    'X-Title': 'PhatTuChatBot',
                    'Content-Type': 'application/json'
                }
            }
        );

        const answer = response.data.choices[0].message.content;
        res.json({ answer });

    } catch (error) {
        console.error('Lỗi từ OpenRouter:', error.response?.data || error.message);
        res.status(500).json({ error: 'Lỗi khi gọi OpenRouter API.' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server đang chạy với OpenRouter (Mistral 7B) tại http://localhost:${PORT}`);
});
