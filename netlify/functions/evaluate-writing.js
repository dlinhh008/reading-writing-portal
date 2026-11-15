exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { taskType, promptText, essayText, wordCount } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Chưa cấu hình GEMINI_API_KEY trên Netlify." })
      };
    }

    const systemInstruction = `
Bạn là giám khảo chấm thi IELTS Writing chuyên nghiệp. Hãy chấm bài viết sau dựa trên đề bài được cung cấp.
Loại bài: ${taskType || "IELTS Writing"}
Đề bài: "${promptText}"
Bài làm của học sinh (${wordCount} từ): "${essayText}"

Hãy trả về kết quả định dạng JSON thuần túy (không dùng markdown \`\`\`json) theo đúng cấu trúc sau:
{
  "overallBand": 6.5,
  "criteria": {
    "taskResponse": { "band": 6.5, "feedback": "Nhận xét chi tiết bằng tiếng Việt..." },
    "coherenceCohesion": { "band": 6.5, "feedback": "Nhận xét chi tiết bằng tiếng Việt..." },
    "lexicalResource": { "band": 6.0, "feedback": "Nhận xét chi tiết bằng tiếng Việt..." },
    "grammaticalRange": { "band": 6.5, "feedback": "Nhận xét chi tiết bằng tiếng Việt..." }
  },
  "corrections": [
    {
      "original": "Câu hoặc cụm từ sai/chưa tự nhiên trong bài",
      "fixed": "Cách sửa lại chuẩn và nâng cấp",
      "explanation": "Giải thích ngắn gọn lý do sửa bằng tiếng Việt"
    }
  ],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "improvements": ["Cần cải thiện 1", "Cần cải thiện 2"],
  "sampleAnswerBand7": "Bài mẫu hoàn chỉnh đạt chuẩn Band 7.0 cho đề bài này (chia đoạn rõ ràng bằng ký tự \\n\\n)."
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstruction }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Lỗi phản hồi từ Gemini API");
    }

    const resultText = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: resultText
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Lỗi khi chấm bài: " + error.message })
    };
  }
};