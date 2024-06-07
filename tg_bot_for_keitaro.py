import requests
import csv
import datetime
import telebot
import re

KEITARO_API_TOKEN = 'KEITARO_API_TOKEN'
KEITARO_API_URL = 'KEITARO_REQUEST_URL'
TELEGRAM_BOT_TOKEN = 'TELEGRAM_TOKEN'

bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)
user_data = {}

def get_keitaro_data(start_date, end_date):
    headers = {
        'Authorization': f'Bearer {KEITARO_API_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    today = datetime.date.today()
    enddata = today.strftime('%Y-%m-%d')

    payload = {
        "range": {
            "from": "2018-01-01",
            "to": enddata,
            "timezone": "Europe/Moscow",
            "interval": None
        },
        "limit": 0,
        "offset": 0,
        "columns": ["sub_id", "offer", "click_datetime", "postback_datetime", "sale_datetime", "status", "campaign_group", "affiliate_network", "stream"],
        "filters": [
            {
                "name": "sale_datetime",
                "operator": "BETWEEN",
                "expression": [start_date, end_date]
            },
            {
                "name": "status",
                "operator": "EQUALS",
                "expression": "sale"
            }
        ],
        "sort": [
            {
                "name": "sale_datetime",
                "order": "DESC"
            }
        ]
    }

    response = requests.post(KEITARO_API_URL, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

def create_csv(data):
    filename = 'report.csv'
    with open(filename, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['sub_id', 'offer', 'click_datetime', 'postback_datetime', 'sale_datetime', 'status', 'campaign_group', 'offer_id', 'affiliate_network', 'stream', 'stream_description'])

        stream_mapping = {
            '760': 'A Non-Organic',
            '76': 'A Organic',
        }

        for item in data['rows']:
            offer = item.get('offer', '')
            offer_id = re.search(r'\#\#(\d+)', offer)
            offer_id = offer_id.group(1) if offer_id else ''
            
            stream = item.get('stream', '') or ''
            stream_id = re.search(r'\[(\d+)\]', stream)
            stream_id = stream_id.group(1) if stream_id else ''
            stream_description = stream_mapping.get(stream_id, 'Unknown ID')

            writer.writerow([
                item.get('sub_id', ''),
                offer,
                item.get('click_datetime', ''),
                item.get('postback_datetime', ''),
                item.get('sale_datetime', ''),
                item.get('status', ''),
                item.get('campaign_group', ''),
                offer_id,
                item.get('affiliate_network', ''),
                stream,
                stream_description
            ])
    return filename

@bot.message_handler(commands=['start'])
def start(message):
    user_data[message.chat.id] = {}
    bot.send_message(message.chat.id, 'Введите start_date в формате YYYY-MM-DD. ВНИМАНИЕ! Вводите дату на день раньше: если нужна выгрузка от 1 января, то пишите 12-31 (31 декабря)')

@bot.message_handler(func=lambda message: message.chat.id in user_data and 'start_date' not in user_data[message.chat.id])
def get_start_date(message):
    try:
        start_date = datetime.datetime.strptime(message.text, '%Y-%m-%d').date()
        user_data[message.chat.id]['start_date'] = start_date
        bot.send_message(message.chat.id, 'Введите end_date в формате YYYY-MM-DD. ВНИМАНИЕ! Вводите дату на день позже: если нужна выгрузка до 31 января, то пишите 02-01 (1 февраля)\n Не забудьте, что выгрузка будет по серверному времени, а значит, нужно прибавить +3 часа.')
    except ValueError:
        bot.send_message(message.chat.id, 'Некорректный формат даты. Пожалуйста, введите дату в формате YYYY-MM-DD.')

@bot.message_handler(func=lambda message: message.chat.id in user_data and 'start_date' in user_data[message.chat.id] and 'end_date' not in user_data[message.chat.id])
def get_end_date(message):
    try:
        end_date = datetime.datetime.strptime(message.text, '%Y-%m-%d').date()
        user_data[message.chat.id]['end_date'] = end_date

        start_date = user_data[message.chat.id]['start_date'].strftime('%Y-%m-%d')
        end_date = user_data[message.chat.id]['end_date'].strftime('%Y-%m-%d')

        data = get_keitaro_data(start_date, end_date)
        csv_file = create_csv(data)
        with open(csv_file, 'rb') as file:
            bot.send_document(message.chat.id, file)

        del user_data[message.chat.id]

    except ValueError:
        bot.send_message(message.chat.id, 'Некорректный формат даты. Пожалуйста, введите дату в формате YYYY-MM-DD')
    except Exception as e:
        bot.reply_to(message, f'Ошибка: {e}')
        del user_data[message.chat.id]

bot.polling()
