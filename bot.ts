import { Telegraf } from 'telegraf';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg; // Деструктурируем Client из импортированного объекта

// Инициализация бота и базы данных
const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

// Подключение к базе данных
client.connect()
    .then(() => console.log('Connected to the database'))
    .catch(err => console.error('Connection error', err.stack));

let currentQuestionIndex = 0;
const questions = [
    "- Напишите Ваше имя.",
    "- Напишите адрес доставки.",
    "- Напишите номер телефона.",
    {
        question: "Какой компанией Вы хотите доставку?",
        options: ["яндекс доставка", "сдек", "почта России"]
    },
    "- Напишите код товара, который Вы хотите заказать?", 
    "- Какое количество?"
];

let userResponses: string[] = [];

bot.start((ctx) => {
    ctx.reply("Добрый день! Меня зовут Травинка. Я помогу Вам оформить заказ. Сейчас я задам Вам несколько вопросов, и мы сможем с Вами оформить  заказ.");
    currentQuestionIndex = 0;
    userResponses = [];
    askQuestion(ctx);
});

function askQuestion(ctx: any) {
    const question = questions[currentQuestionIndex];

    if (typeof question === 'string') {
        ctx.reply(question);
    } else {
        ctx.reply(question.question, {
            reply_markup: {
                keyboard: question.options.map(option => [option]),
                one_time_keyboard: true,
                resize_keyboard: true,
            }
        });
    }
}

bot.on('text', async (ctx) => {
    const answer = ctx.message.text;

    if (currentQuestionIndex < questions.length) {
        userResponses.push(answer);
        currentQuestionIndex++;

        if (currentQuestionIndex < questions.length) {
            askQuestion(ctx);
        } else {
            await saveResponses(userResponses);
            ctx.reply("Спасибо за ваши ответы!");
            currentQuestionIndex = 0; // Сбросить для следующей сессии
        }
    }
});

async function saveResponses(responses: string[]) {
    const query = 'INSERT INTO requests(name, delivery_adress, callnumber, delivery_company, pcode, quantity) VALUES($1, $2, $3, $4, $5, $6)';
    await client.query(query, responses);
}

bot.launch().then(() => {
    console.log('Bot is running...');
}).catch(err => console.error(err));