const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'onboarding.db');
const db = new Database(dbPath);

const initDb = () => {
  return new Promise((resolve) => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        chat_id INTEGER PRIMARY KEY,
        state TEXT DEFAULT 'START',
        name TEXT,
        phone TEXT,
        ine_status TEXT DEFAULT 'pending',
        contract_status TEXT DEFAULT 'pending',
        bank_name TEXT,
        clabe TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    resolve();
  });
};

const getUser = (chat_id) => {
  return Promise.resolve(db.prepare('SELECT * FROM users WHERE chat_id = ?').get(chat_id));
};

const updateUser = (chat_id, data) => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  
  const info = db.prepare(`UPDATE users SET ${setClause} WHERE chat_id = ?`).run(...values, chat_id);
  return Promise.resolve(info.changes);
};

const createUser = (chat_id) => {
  const info = db.prepare('INSERT OR IGNORE INTO users (chat_id, state) VALUES (?, ?)').run(chat_id, 'START');
  return Promise.resolve(info.lastInsertRowid);
};

const resetUser = (chat_id) => {
  const info = db.prepare('UPDATE users SET state = ?, name = NULL, phone = NULL, ine_status = ?, contract_status = ?, bank_name = NULL, clabe = NULL WHERE chat_id = ?')
    .run('START', 'pending', 'pending', chat_id);
  return Promise.resolve(info.changes);
};

module.exports = {
  initDb,
  getUser,
  updateUser,
  createUser,
  resetUser
};
