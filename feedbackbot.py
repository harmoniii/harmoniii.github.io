from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

TOKEN = #"TOKEN"
TARGET_CHAT_ID = #CHATID

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Привет! Отправь сообщение в формате: /feedback твой текст")

async def feedback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.replace("/feedback", "").strip()

    if text:
        await context.bot.send_message(chat_id=TARGET_CHAT_ID, text=f"📩 Анонимное сообщение:\n{text}")
        await update.message.reply_text("Твой фидбэк отправлен!")
    else:
        await update.message.reply_text("Ты не написал текст. Используй: /feedback твой текст")

def main():
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("feedback", feedback))

    print("Бот запущен...")
    app.run_polling()

if __name__ == "__main__":
    main()
