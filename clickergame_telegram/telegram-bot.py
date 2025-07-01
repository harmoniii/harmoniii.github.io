#!/usr/bin/env python3
# telegram-bot.py - Серверная часть бота для Grid Clicker Game

import logging
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import sqlite3
import os
from pathlib import Path

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import (
    Application, 
    CommandHandler, 
    MessageHandler, 
    CallbackQueryHandler,
    ContextTypes,
    filters
)

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class GridClickerBot:
    def __init__(self, token: str, webapp_url: str):
        self.token = token
        self.webapp_url = webapp_url
        self.db_path = "grid_clicker_bot.db"
        
        # Инициализация базы данных
        self.init_database()
        
        # Создание приложения
        self.application = Application.builder().token(token).build()
        
        # Регистрация обработчиков
        self.setup_handlers()
    
    def init_database(self):
        """Инициализация SQLite базы данных"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Таблица пользователей
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                language_code TEXT,
                is_premium BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_sessions INTEGER DEFAULT 0
            )
        ''')
        
        # Таблица игровых сессий
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                session_end TIMESTAMP,
                total_clicks INTEGER DEFAULT 0,
                max_combo INTEGER DEFAULT 0,
                resources_gained INTEGER DEFAULT 0,
                buildings_built INTEGER DEFAULT 0,
                skills_learned INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        # Таблица сохранений игры
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS game_saves (
                user_id INTEGER PRIMARY KEY,
                save_data TEXT,
                save_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                version TEXT,
                backup_count INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        # Таблица статистики
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_statistics (
                user_id INTEGER PRIMARY KEY,
                total_playtime_hours REAL DEFAULT 0,
                total_resources REAL DEFAULT 0,
                highest_combo INTEGER DEFAULT 0,
                total_clicks INTEGER DEFAULT 0,
                buildings_built INTEGER DEFAULT 0,
                skills_learned INTEGER DEFAULT 0,
                raids_completed INTEGER DEFAULT 0,
                achievements_unlocked INTEGER DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        # Таблица лидерборда
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS leaderboard (
                user_id INTEGER,
                category TEXT,
                score REAL,
                rank INTEGER,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, category),
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully")
    
    def setup_handlers(self):
        """Настройка обработчиков команд и сообщений"""
        
        # Команды
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("stats", self.stats_command))
        self.application.add_handler(CommandHandler("leaderboard", self.leaderboard_command))
        self.application.add_handler(CommandHandler("backup", self.backup_command))
        self.application.add_handler(CommandHandler("export", self.export_command))
        
        # Обработка данных от WebApp
        self.application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, self.handle_webapp_data))
        
        # Callback query обработчики
        self.application.add_handler(CallbackQueryHandler(self.handle_callback))
        
        # Обработчик сообщений
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))
        
        logger.info("Handlers setup completed")
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /start"""
        user = update.effective_user
        
        # Регистрируем пользователя в базе данных
        await self.register_user(user)
        
        # Создание клавиатуры с Web App
        keyboard = [
            [InlineKeyboardButton("🎮 Play Grid Clicker", web_app=WebAppInfo(url=self.webapp_url))],
            [
                InlineKeyboardButton("📊 Statistics", callback_data="stats"),
                InlineKeyboardButton("🏆 Leaderboard", callback_data="leaderboard")
            ],
            [
                InlineKeyboardButton("💾 Backup Game", callback_data="backup"),
                InlineKeyboardButton("❓ Help", callback_data="help")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        welcome_text = f"""
🎮 <b>Welcome to Grid Clicker!</b>

Hello {user.first_name}! Ready to start your clicking adventure?

<b>🎯 How to Play:</b>
• Click the red target cell in the 3x3 grid
• Build combo chains for higher rewards
• Construct buildings to automate resource production
• Learn skills to enhance your abilities
• Send expeditions on dangerous raids
• Collect achievements and climb the leaderboard

<b>☁️ Cloud Features:</b>
• Your progress is automatically saved to Telegram Cloud
• Play seamlessly across different devices
• Share your achievements with friends

Click "🎮 Play Grid Clicker" to start!
        """
        
        await update.message.reply_text(
            welcome_text,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /help"""
        help_text = """
🆘 <b>Grid Clicker Help</b>

<b>🎮 Game Commands:</b>
/start - Start the game or return to main menu
/stats - View your detailed statistics
/leaderboard - Check global rankings
/backup - Create a manual backup of your game
/export - Export your game data

<b>🎯 Game Mechanics:</b>
• <b>Grid System:</b> 3x3 grid with target cell (red), energy cells (green), and bonus cells (orange)
• <b>Combo System:</b> Hit consecutive targets to build combo multipliers
• <b>Energy:</b> Required for clicking, regenerates over time
• <b>Buildings:</b> Automated resource production
• <b>Skills:</b> Permanent upgrades using Skill Points
• <b>Raids:</b> Risky expeditions for rare resources
• <b>Effects:</b> Random buffs and debuffs that modify gameplay

<b>💡 Pro Tips:</b>
• Focus on energy management early game
• Build generators for better energy efficiency
• Save people before starting raids
• Use Shield buff before attempting long combos
• Buy during Tax Boom effect for discounts

<b>🐛 Issues?</b>
If you encounter any problems, please describe the issue and we'll help you resolve it.

<b>☁️ Cloud Storage:</b>
Your game automatically saves to Telegram Cloud every 2 minutes and after important events.
        """
        
        await update.message.reply_text(help_text, parse_mode='HTML')
    
    async def stats_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /stats"""
        user_id = update.effective_user.id
        stats = await self.get_user_statistics(user_id)
        
        if not stats:
            await update.message.reply_text("📊 No statistics available yet. Play the game to generate stats!")
            return
        
        stats_text = f"""
📊 <b>Your Grid Clicker Statistics</b>

<b>🎯 Gameplay Stats:</b>
• Total Clicks: <code>{stats.get('total_clicks', 0):,}</code>
• Highest Combo: <code>{stats.get('highest_combo', 0)}</code>
• Total Resources: <code>{stats.get('total_resources', 0):,.0f}</code>

<b>🏗️ Progress:</b>
• Buildings Built: <code>{stats.get('buildings_built', 0)}</code>
• Skills Learned: <code>{stats.get('skills_learned', 0)}</code>
• Raids Completed: <code>{stats.get('raids_completed', 0)}</code>
• Achievements: <code>{stats.get('achievements_unlocked', 0)}</code>

<b>⏱️ Time Investment:</b>
• Estimated Playtime: <code>{stats.get('total_playtime_hours', 0):.1f}</code> hours
• Last Updated: <code>{stats.get('last_updated', 'Never')}</code>

<b>🏆 Ranking:</b>
• Global Rank: <code>#{await self.get_user_rank(user_id, 'total_resources')}</code>
        """
        
        keyboard = [
            [InlineKeyboardButton("🎮 Play Game", web_app=WebAppInfo(url=self.webapp_url))],
            [InlineKeyboardButton("🏆 View Leaderboard", callback_data="leaderboard")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(stats_text, reply_markup=reply_markup, parse_mode='HTML')
    
    async def leaderboard_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /leaderboard"""
        await self.show_leaderboard(update, context)
    
    async def backup_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Создание резервной копии игры"""
        user_id = update.effective_user.id
        
        # Получаем сохранение пользователя
        save_data = await self.get_user_save(user_id)
        
        if not save_data:
            await update.message.reply_text("💾 No save data found. Play the game first to create a backup!")
            return
        
        # Создаем backup файл
        backup_filename = f"grid_clicker_backup_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        backup_data = {
            "user_id": user_id,
            "backup_created": datetime.now().isoformat(),
            "game_version": save_data.get('version', 'unknown'),
            "save_data": save_data
        }
        
        # Сохраняем backup в базу данных
        await self.save_backup(user_id, backup_data)
        
        backup_text = f"""
💾 <b>Backup Created Successfully!</b>

<b>Backup Details:</b>
• User ID: <code>{user_id}</code>
• Created: <code>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</code>
• Game Version: <code>{save_data.get('version', 'Unknown')}</code>
• Data Size: <code>{len(str(save_data))} characters</code>

<b>📱 Restore Instructions:</b>
Your game data is automatically restored from Telegram Cloud when you open the game. This backup serves as an additional safety measure.

<b>⚠️ Important:</b>
Keep your Telegram account secure as it contains your game progress!
        """
        
        keyboard = [
            [InlineKeyboardButton("🎮 Play Game", web_app=WebAppInfo(url=self.webapp_url))]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(backup_text, reply_markup=reply_markup, parse_mode='HTML')
    
    async def export_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Экспорт игровых данных"""
        user_id = update.effective_user.id
        
        # Получаем все данные пользователя
        user_data = await self.get_user_data(user_id)
        stats = await self.get_user_statistics(user_id)
        save_data = await self.get_user_save(user_id)
        
        if not any([user_data, stats, save_data]):
            await update.message.reply_text("📤 No data available for export. Play the game first!")
            return
        
        export_data = {
            "export_created": datetime.now().isoformat(),
            "user_info": user_data,
            "statistics": stats,
            "save_data": save_data,
            "export_version": "1.0"
        }
        
        # Создаем текстовый отчет
        report_text = f"""
📤 <b>Game Data Export</b>

<b>👤 Player Info:</b>
• User ID: <code>{user_id}</code>
• Username: <code>{user_data.get('username', 'N/A')}</code>
• Name: <code>{user_data.get('first_name', 'Unknown')}</code>
• Member Since: <code>{user_data.get('created_at', 'Unknown')}</code>

<b>📊 Current Stats:</b>
• Total Resources: <code>{stats.get('total_resources', 0):,.0f}</code>
• Highest Combo: <code>{stats.get('highest_combo', 0)}</code>
• Buildings: <code>{stats.get('buildings_built', 0)}</code>
• Skills: <code>{stats.get('skills_learned', 0)}</code>
• Playtime: <code>{stats.get('total_playtime_hours', 0):.1f}h</code>

<b>💾 Save Data:</b>
• Version: <code>{save_data.get('version', 'Unknown') if save_data else 'No save'}</code>
• Last Save: <code>{save_data.get('save_timestamp', 'Never') if save_data else 'Never'}</code>

<b>📄 Full Export:</b>
Complete data export is available through the game's export function in the Web App.
        """
        
        keyboard = [
            [InlineKeyboardButton("🎮 Open Game", web_app=WebAppInfo(url=self.webapp_url))],
            [InlineKeyboardButton("💾 Create Backup", callback_data="backup")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(report_text, reply_markup=reply_markup, parse_mode='HTML')
    
    async def handle_webapp_data(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработка данных от Web App"""
        try:
            data = json.loads(update.effective_message.web_app_data.data)
            user_id = update.effective_user.id
            
            data_type = data.get('type', 'unknown')
            
            if data_type == 'game_statistics':
                await self.process_game_statistics(user_id, data)
                await update.message.reply_text("📊 Statistics updated successfully!")
                
            elif data_type == 'game_export':
                await self.process_game_export(user_id, data)
                await update.message.reply_text("📤 Game data exported successfully!")
                
            elif data_type == 'error_report':
                await self.process_error_report(user_id, data)
                await update.message.reply_text("🐛 Error report received. Thank you for helping improve the game!")
                
            else:
                logger.warning(f"Unknown data type: {data_type}")
                await update.message.reply_text("⚠️ Received unknown data type")
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse WebApp data: {e}")
            await update.message.reply_text("❌ Failed to process data from game")
        except Exception as e:
            logger.error(f"Error handling WebApp data: {e}")
            await update.message.reply_text("❌ An error occurred while processing your request")
    
    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработка callback queries"""
        query = update.callback_query
        await query.answer()
        
        data = query.data
        
        if data == "stats":
            await self.stats_command(update, context)
        elif data == "leaderboard":
            await self.show_leaderboard(update, context)
        elif data == "backup":
            await self.backup_command(update, context)
        elif data == "help":
            await self.help_command(update, context)
        elif data.startswith("leaderboard_"):
            category = data.replace("leaderboard_", "")
            await self.show_category_leaderboard(update, context, category)
    
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработка текстовых сообщений"""
        text = update.message.text.lower()
        
        if any(word in text for word in ['play', 'game', 'start']):
            keyboard = [[InlineKeyboardButton("🎮 Play Grid Clicker", web_app=WebAppInfo(url=self.webapp_url))]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text("🎮 Click the button below to play!", reply_markup=reply_markup)
            
        elif any(word in text for word in ['stats', 'statistics']):
            await self.stats_command(update, context)
            
        elif any(word in text for word in ['help', 'how']):
            await self.help_command(update, context)
            
        else:
            await update.message.reply_text(
                "I'm not sure what you mean. Use /help to see available commands or click below to play!",
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton("🎮 Play Game", web_app=WebAppInfo(url=self.webapp_url))
                ]])
            )
    
    # Методы для работы с базой данных
    
    async def register_user(self, user):
        """Регистрация пользователя в базе данных"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO users 
            (user_id, username, first_name, last_name, language_code, is_premium, last_seen)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            user.id,
            user.username,
            user.first_name,
            user.last_name,
            user.language_code,
            getattr(user, 'is_premium', False),
            datetime.now()
        ))
        
        # Увеличиваем счетчик сессий
        cursor.execute('''
            UPDATE users SET total_sessions = total_sessions + 1 WHERE user_id = ?
        ''', (user.id,))
        
        conn.commit()
        conn.close()
        logger.info(f"User {user.id} registered/updated")
    
    async def get_user_data(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Получение данных пользователя"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    async def get_user_statistics(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Получение статистики пользователя"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM user_statistics WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    async def get_user_save(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Получение сохранения игры пользователя"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT save_data FROM game_saves WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row and row[0]:
            try:
                return json.loads(row[0])
            except json.JSONDecodeError:
                logger.error(f"Failed to parse save data for user {user_id}")
        return None
    
    async def save_backup(self, user_id: int, backup_data: Dict[str, Any]):
        """Сохранение резервной копии"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE game_saves 
            SET backup_count = backup_count + 1 
            WHERE user_id = ?
        ''', (user_id,))
        
        conn.commit()
        conn.close()
        logger.info(f"Backup created for user {user_id}")
    
    async def get_user_rank(self, user_id: int, category: str) -> int:
        """Получение ранга пользователя в определенной категории"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT rank FROM leaderboard 
            WHERE user_id = ? AND category = ?
        ''', (user_id, category))
        
        row = cursor.fetchone()
        conn.close()
        
        return row[0] if row else 999
    
    async def process_game_statistics(self, user_id: int, data: Dict[str, Any]):
        """Обработка статистики игры"""
        stats = data.get('stats', {})
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO user_statistics
            (user_id, total_playtime_hours, total_resources, highest_combo, 
             total_clicks, buildings_built, skills_learned, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            stats.get('playtimeEstimate', 0),
            stats.get('totalResources', 0),
            stats.get('maxCombo', 0),
            stats.get('totalClicks', 0),
            stats.get('buildingLevels', 0),
            stats.get('skillLevels', 0),
            datetime.now()
        ))
        
        # Обновляем лидерборд
        await self.update_leaderboard(user_id, stats)
        
        conn.commit()
        conn.close()
        logger.info(f"Statistics updated for user {user_id}")
    
    async def process_game_export(self, user_id: int, data: Dict[str, Any]):
        """Обработка экспорта игры"""
        save_data = data.get('data', {})
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO game_saves
            (user_id, save_data, save_timestamp, version)
            VALUES (?, ?, ?, ?)
        ''', (
            user_id,
            json.dumps(save_data),
            datetime.now(),
            save_data.get('version', 'unknown')
        ))
        
        conn.commit()
        conn.close()
        logger.info(f"Game data exported for user {user_id}")
    
    async def process_error_report(self, user_id: int, data: Dict[str, Any]):
        """Обработка отчета об ошибке"""
        error_info = data.get('error', {})
        
        # Логируем ошибку
        logger.error(f"Game error from user {user_id}: {error_info.get('message', 'Unknown error')}")
        
        # Здесь можно добавить отправку в систему мониторинга ошибок
        # Например, Sentry, или отправку в отдельный канал администраторов
    
    async def update_leaderboard(self, user_id: int, stats: Dict[str, Any]):
        """Обновление позиций в лидерборде"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        categories = {
            'total_resources': stats.get('totalResources', 0),
            'highest_combo': stats.get('maxCombo', 0),
            'total_clicks': stats.get('totalClicks', 0),
            'buildings_built': stats.get('buildingLevels', 0)
        }
        
        for category, score in categories.items():
            cursor.execute('''
                INSERT OR REPLACE INTO leaderboard
                (user_id, category, score, updated_at)
                VALUES (?, ?, ?, ?)
            ''', (user_id, category, score, datetime.now()))
        
        # Пересчитываем ранги
        for category in categories.keys():
            cursor.execute(f'''
                UPDATE leaderboard SET rank = (
                    SELECT COUNT(*) + 1 FROM leaderboard l2 
                    WHERE l2.category = leaderboard.category 
                    AND l2.score > leaderboard.score
                ) WHERE category = ?
            ''', (category,))
        
        conn.commit()
        conn.close()
    
    async def show_leaderboard(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Показ главного лидерборда"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Топ-10 по общим ресурсам
        cursor.execute('''
            SELECT l.rank, u.first_name, u.username, l.score
            FROM leaderboard l
            JOIN users u ON l.user_id = u.user_id
            WHERE l.category = 'total_resources'
            ORDER BY l.rank
            LIMIT 10
        ''')
        
        top_players = cursor.fetchall()
        conn.close()
        
        if not top_players:
            leaderboard_text = "🏆 <b>Global Leaderboard</b>\n\nNo players yet! Be the first to make it to the leaderboard!"
        else:
            leaderboard_text = "🏆 <b>Global Leaderboard</b>\n<i>Top Players by Total Resources</i>\n\n"
            
            medals = ["🥇", "🥈", "🥉"]
            
            for i, player in enumerate(top_players):
                medal = medals[i] if i < 3 else f"{i+1}."
                name = player['first_name'] or player['username'] or "Anonymous"
                score = f"{player['score']:,.0f}"
                leaderboard_text += f"{medal} <b>{name}</b> - {score} resources\n"
        
        keyboard = [
            [
                InlineKeyboardButton("🎯 Combo Leaders", callback_data="leaderboard_highest_combo"),
                InlineKeyboardButton("👆 Click Masters", callback_data="leaderboard_total_clicks")
            ],
            [
                InlineKeyboardButton("🏗️ Builders", callback_data="leaderboard_buildings_built"),
                InlineKeyboardButton("🎮 Play Game", web_app=WebAppInfo(url=self.webapp_url))
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        if update.callback_query:
            await update.callback_query.edit_message_text(
                leaderboard_text, 
                reply_markup=reply_markup, 
                parse_mode='HTML'
            )
        else:
            await update.message.reply_text(
                leaderboard_text, 
                reply_markup=reply_markup, 
                parse_mode='HTML'
            )
    
    async def show_category_leaderboard(self, update: Update, context: ContextTypes.DEFAULT_TYPE, category: str):
        """Показ лидерборда по конкретной категории"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT l.rank, u.first_name, u.username, l.score
            FROM leaderboard l
            JOIN users u ON l.user_id = u.user_id
            WHERE l.category = ?
            ORDER BY l.rank
            LIMIT 10
        ''', (category,))
        
        top_players = cursor.fetchall()
        conn.close()
        
        category_names = {
            'highest_combo': '🎯 Highest Combo',
            'total_clicks': '👆 Total Clicks',
            'buildings_built': '🏗️ Buildings Built'
        }
        
        category_name = category_names.get(category, category)
        
        if not top_players:
            leaderboard_text = f"🏆 <b>{category_name}</b>\n\nNo data available yet!"
        else:
            leaderboard_text = f"🏆 <b>{category_name}</b>\n\n"
            
            medals = ["🥇", "🥈", "🥉"]
            
            for i, player in enumerate(top_players):
                medal = medals[i] if i < 3 else f"{i+1}."
                name = player['first_name'] or player['username'] or "Anonymous"
                
                if category == 'total_clicks':
                    score = f"{player['score']:,.0f} clicks"
                elif category == 'highest_combo':
                    score = f"{player['score']:,.0f} combo"
                elif category == 'buildings_built':
                    score = f"{player['score']:,.0f} levels"
                else:
                    score = f"{player['score']:,.0f}"
                
                leaderboard_text += f"{medal} <b>{name}</b> - {score}\n"
        
        keyboard = [
            [InlineKeyboardButton("← Back to Leaderboard", callback_data="leaderboard")],
            [InlineKeyboardButton("🎮 Play Game", web_app=WebAppInfo(url=self.webapp_url))]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.callback_query.edit_message_text(
            leaderboard_text, 
            reply_markup=reply_markup, 
            parse_mode='HTML'
        )
    
    def run(self):
        """Запуск бота"""
        logger.info("Starting Grid Clicker Bot...")
        self.application.run_polling(allowed_updates=Update.ALL_TYPES)


# Конфигурация и запуск
def main():
    """Главная функция запуска бота"""
    
    # Получаем токен и URL из переменных окружения
    BOT_TOKEN = os.getenv('BOT_TOKEN')
    WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://your-domain.com/grid-clicker')
    
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN environment variable is required!")
        return
    
    # Создаем и запускаем бота
    bot = GridClickerBot(BOT_TOKEN, WEBAPP_URL)
    
    try:
        bot.run()
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Bot crashed: {e}")


if __name__ == '__main__':
    main()