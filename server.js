const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Функция вызова DeepSeek
async function callDeepSeekNeural(answer, currentSubject) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
        console.log('⚠️ DeepSeek API ключ не найден!');
        return {
            beats: Math.random() > 0.5,
            reason: 'Демо-режим: установите DEEPSEEK_API_KEY'
        };
    }
    
    const prompt = `Ты судья в игре "Что бьёт что?".
Вопрос: Бьёт ли "${answer}" объект "${currentSubject}"?
Ответь ТОЛЬКО JSON в формате: {"beats": true/false, "reason": "короткое объяснение на русском"}

Примеры:
- "вода" бьёт "камень" → {"beats": true, "reason": "вода точит камень"}
- "бумага" бьёт "камень" → {"beats": true, "reason": "бумага оборачивает камень"}
- "огонь" бьёт "воду" → {"beats": false, "reason": "вода тушит огонь"}
- "санкции" бьёт "россию" → {"beats": true, "reason": "санкции бьют по экономике"}

Отвечай ТОЛЬКО JSON, без лишних слов.`;

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'Ты эксперт по логическим связям. Отвечаешь только JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 150
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            const rawText = data.choices[0].message.content;
            console.log('📝 DeepSeek ответ:', rawText);
            
            try {
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        beats: parsed.beats === true || parsed.beats === 'true',
                        reason: parsed.reason || 'Логический вывод'
                    };
                }
            } catch (e) {
                console.log('Ошибка парсинга JSON');
            }
            
            const lowerText = rawText.toLowerCase();
            const beats = lowerText.includes('"beats": true') || 
                         (lowerText.includes('да') && !lowerText.includes('нет'));
            
            return {
                beats: beats,
                reason: rawText.substring(0, 150)
            };
        }
        
        throw new Error('Неожиданный ответ от API');
        
    } catch (error) {
        console.error('❌ Ошибка DeepSeek:', error.message);
        return {
            beats: Math.random() > 0.5,
            reason: `Ошибка API: ${error.message}`
        };
    }
}

// API эндпоинты
app.post('/api/think', async (req, res) => {
    const { answer, currentSubject } = req.body;
    
    console.log(`\n🤔 DeepSeek думает: "${answer}" бьёт "${currentSubject}"?`);
    
    const result = await callDeepSeekNeural(answer, currentSubject);
    
    console.log(`📢 Вердикт: ${result.beats ? '✅ ДА' : '❌ НЕТ'} - ${result.reason}`);
    
    res.json({
        success: true,
        beats: result.beats,
        reason: result.reason,
        currentSubject: result.beats ? answer : currentSubject,
        neuralNetwork: 'DeepSeek'
    });
});

app.get('/api/stats', (req, res) => {
    res.json({
        neuralNetwork: 'DeepSeek V3',
        status: 'active',
        apiKeySet: !!process.env.DEEPSEEK_API_KEY,
        pricing: 'Бесплатно (5M токенов)'
    });
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║  🧠 DEEPSEEK НЕЙРОСЕТЬ ЗАПУЩЕНА!                ║
║  🌐 Порт: ${PORT}                                 ║
║  📊 API Key: ${process.env.DEEPSEEK_API_KEY ? '✅ УСТАНОВЛЕН' : '❌ НЕ УСТАНОВЛЕН'}
╚══════════════════════════════════════════════════╝
    `);
});
