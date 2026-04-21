const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'onboarding.db');
const db = new sqlite3.Database(dbPath);

const initDb = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
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
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

const getUser = (chat_id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE chat_id = ?', [chat_id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const updateUser = (chat_id, data) => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  
  return new Promise((resolve, reject) => {
    db.run(`UPDATE users SET ${setClause} WHERE chat_id = ?`, [...values, chat_id], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

const createUser = (chat_id) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT OR IGNORE INTO users (chat_id, state) VALUES (?, ?)', [chat_id, 'START'], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const resetUser = (chat_id) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE users SET state = ?, name = NULL, phone = NULL, ine_status = ?, contract_status = ?, bank_name = NULL, clabe = NULL WHERE chat_id = ?', 
      ['START', 'pending', 'pending', chat_id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  };

module.exports = {
  initDb,
  getUser,
  updateUser,
  createUser,
  resetUser
};
