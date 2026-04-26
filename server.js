// =============================================
// DOTA 2 RUSSIA WIKI — Server
// Node.js + Express backend
// =============================================

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// ===== MIDDLEWARE =====
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Настройка сессий
app.use(session({
  secret: 'dota2-wiki-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24 часа
    httpOnly: true
  }
}));

// ===== HELPER FUNCTIONS =====

// Чтение данных из JSON файлов
function readJSON(filename) {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'database', filename), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка чтения ${filename}:`, error);
    return [];
  }
}

// Запись данных в JSON файлы
function writeJSON(filename, data) {
  try {
    fs.writeFileSync(
      path.join(__dirname, 'database', filename),
      JSON.stringify(data, null, 2),
      'utf8'
    );
    return true;
  } catch (error) {
    console.error(`Ошибка записи ${filename}:`, error);
    return false;
  }
}

// Middleware для проверки авторизации
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Необходима авторизация' });
  }
}

// Middleware для проверки прав администратора
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
  }
}

// ===== API ROUTES =====

// --- Игроки ---

// Получить всех игроков
app.get('/api/players', (req, res) => {
  const players = readJSON('players.json');
  res.json(players);
});

// Получить игрока по ID
app.get('/api/players/:id', (req, res) => {
  const players = readJSON('players.json');
  const player = players.find(p => p.id === parseInt(req.params.id));
  
  if (player) {
    res.json(player);
  } else {
    res.status(404).json({ error: 'Игрок не найден' });
  }
});

// Добавить нового игрока (только для админа)
app.post('/api/players', isAuthenticated, isAdmin, (req, res) => {
  const players = readJSON('players.json');
  
  const newPlayer = {
    id: players.length > 0 ? Math.max(...players.map(p => p.id)) + 1 : 1,
    nickname: req.body.nickname,
    realName: req.body.realName,
    team: req.body.team,
    role: req.body.role,
    photo: req.body.photo || '',
    description: req.body.description,
    biography: req.body.biography,
    achievements: req.body.achievements || [],
    teams: req.body.teams || [],
    country: req.body.country || 'Россия',
    age: req.body.age || 0,
    mmr: req.body.mmr || 0
  };
  
  players.push(newPlayer);
  
  if (writeJSON('players.json', players)) {
    res.status(201).json(newPlayer);
  } else {
    res.status(500).json({ error: 'Ошибка сохранения данных' });
  }
});

// Обновить игрока (только для админа)
app.put('/api/players/:id', isAuthenticated, isAdmin, (req, res) => {
  const players = readJSON('players.json');
  const index = players.findIndex(p => p.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Игрок не найден' });
  }
  
  players[index] = {
    ...players[index],
    ...req.body,
    id: players[index].id // ID не меняется
  };
  
  if (writeJSON('players.json', players)) {
    res.json(players[index]);
  } else {
    res.status(500).json({ error: 'Ошибка сохранения данных' });
  }
});

// Удалить игрока (только для админа)
app.delete('/api/players/:id', isAuthenticated, isAdmin, (req, res) => {
  const players = readJSON('players.json');
  const filteredPlayers = players.filter(p => p.id !== parseInt(req.params.id));
  
  if (players.length === filteredPlayers.length) {
    return res.status(404).json({ error: 'Игрок не найден' });
  }
  
  if (writeJSON('players.json', filteredPlayers)) {
    res.json({ message: 'Игрок успешно удален' });
  } else {
    res.status(500).json({ error: 'Ошибка сохранения данных' });
  }
});

// --- Команды ---

// Получить все команды
app.get('/api/teams', (req, res) => {
  const teams = readJSON('teams.json');
  res.json(teams);
});

// Получить команду по ID
app.get('/api/teams/:id', (req, res) => {
  const teams = readJSON('teams.json');
  const team = teams.find(t => t.id === parseInt(req.params.id));
  
  if (team) {
    // Получаем игроков команды
    const players = readJSON('players.json');
    const teamPlayers = players.filter(p => team.players.includes(p.id));
    
    res.json({
      ...team,
      playerDetails: teamPlayers
    });
  } else {
    res.status(404).json({ error: 'Команда не найдена' });
  }
});

// Добавить новую команду (только для админа)
app.post('/api/teams', isAuthenticated, isAdmin, (req, res) => {
  const teams = readJSON('teams.json');
  
  const newTeam = {
    id: teams.length > 0 ? Math.max(...teams.map(t => t.id)) + 1 : 1,
    name: req.body.name,
    shortName: req.body.shortName,
    logo: req.body.logo || '',
    region: req.body.region,
    country: req.body.country,
    founded: req.body.founded,
    description: req.body.description,
    achievements: req.body.achievements || [],
    players: req.body.players || [],
    website: req.body.website || '',
    twitter: req.body.twitter || '',
    founded_date: req.body.founded_date || new Date().toISOString()
  };
  
  teams.push(newTeam);
  
  if (writeJSON('teams.json', teams)) {
    res.status(201).json(newTeam);
  } else {
    res.status(500).json({ error: 'Ошибка сохранения данных' });
  }
});

// Обновить команду (только для админа)
app.put('/api/teams/:id', isAuthenticated, isAdmin, (req, res) => {
  const teams = readJSON('teams.json');
  const index = teams.findIndex(t => t.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Команда не найдена' });
  }
  
  teams[index] = {
    ...teams[index],
    ...req.body,
    id: teams[index].id // ID не меняется
  };
  
  if (writeJSON('teams.json', teams)) {
    res.json(teams[index]);
  } else {
    res.status(500).json({ error: 'Ошибка сохранения данных' });
  }
});

// Удалить команду (только для админа)
app.delete('/api/teams/:id', isAuthenticated, isAdmin, (req, res) => {
  const teams = readJSON('teams.json');
  const filteredTeams = teams.filter(t => t.id !== parseInt(req.params.id));
  
  if (teams.length === filteredTeams.length) {
    return res.status(404).json({ error: 'Команда не найдена' });
  }
  
  if (writeJSON('teams.json', filteredTeams)) {
    res.json({ message: 'Команда успешно удалена' });
  } else {
    res.status(500).json({ error: 'Ошибка сохранения данных' });
  }
});

// --- Комментарии ---

// Получить комментарии для игрока
app.get('/api/comments/player/:playerId', (req, res) => {
  const comments = readJSON('comments.json');
  const playerComments = comments
    .filter(c => c.playerId === parseInt(req.params.playerId))
    .sort((a, b) => {
      // Закрепленные комментарии сначала
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Затем по дате (новые сначала)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  
  res.json(playerComments);
});

// Добавить комментарий (требуется авторизация)
app.post('/api/comments', isAuthenticated, (req, res) => {
  const comments = readJSON('comments.json');
  
  const newComment = {
    id: comments.length > 0 ? Math.max(...comments.map(c => c.id)) + 1 : 1,
    playerId: req.body.playerId,
    userId: req.session.user.id,
    username: req.session.user.username,
    text: req.body.text,
    likes: 0,
    likedBy: [],
    isPinned: false,
    createdAt: new Date().toISOString()
  };
  
  comments.push(newComment);
  
  if (writeJSON('comments.json', comments)) {
    res.status(201).json(newComment);
  } else {
    res.status(500).json({ error: 'Ошибка сохранения комментария' });
  }
});

// Лайкнуть комментарий (требуется авторизация)
app.post('/api/comments/:id/like', isAuthenticated, (req, res) => {
  const comments = readJSON('comments.json');
  const comment = comments.find(c => c.id === parseInt(req.params.id));
  
  if (!comment) {
    return res.status(404).json({ error: 'Комментарий не найден' });
  }
  
  const userId = req.session.user.id;
  const likedIndex = comment.likedBy.indexOf(userId);
  
  if (likedIndex === -1) {
    // Добавить лайк
    comment.likedBy.push(userId);
    comment.likes = comment.likedBy.length;
  } else {
    // Убрать лайк
    comment.likedBy.splice(likedIndex, 1);
    comment.likes = comment.likedBy.length;
  }
  
  if (writeJSON('comments.json', comments)) {
    res.json(comment);
  } else {
    res.status(500).json({ error: 'Ошибка сохранения данных' });
  }
});

// Закрепить/открепить комментарий (только для админа)
app.put('/api/comments/:id/pin', isAuthenticated, isAdmin, (req, res) => {
  const comments = readJSON('comments.json');
  const comment = comments.find(c => c.id === parseInt(req.params.id));
  
  if (!comment) {
    return res.status(404).json({ error: 'Комментарий не найден' });
  }
  
  comment.isPinned = !comment.isPinned;
  
  if (writeJSON('comments.json', comments)) {
    res.json(comment);
  } else {
    res.status(500).json({ error: 'Ошибка сохранения данных' });
  }
});

// Удалить комментарий (только для админа)
app.delete('/api/comments/:id', isAuthenticated, isAdmin, (req, res) => {
  const comments = readJSON('comments.json');
  const filteredComments = comments.filter(c => c.id !== parseInt(req.params.id));
  
  if (comments.length === filteredComments.length) {
    return res.status(404).json({ error: 'Комментарий не найден' });
  }
  
  if (writeJSON('comments.json', filteredComments)) {
    res.json({ message: 'Комментарий успешно удален' });
  } else {
    res.status(500).json({ error: 'Ошибка сохранения данных' });
  }
});

// --- Аутентификация ---

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  const { username, password, email } = req.body;
  
  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  
  const users = readJSON('users.json');
  
  // Проверка существования пользователя
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
  }
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email уже используется' });
  }
  
  // Хеширование пароля
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    username,
    password: hashedPassword,
    email,
    role: 'user',
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  if (writeJSON('users.json', users)) {
    res.status(201).json({ 
      message: 'Регистрация успешна',
      user: { id: newUser.id, username: newUser.username, role: newUser.role }
    });
  } else {
    res.status(500).json({ error: 'Ошибка сохранения данных' });
  }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  
  const users = readJSON('users.json');
  const user = users.find(u => u.username === username);
  
  if (!user) {
    return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
  }
  
  // Проверка пароля
  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
  }
  
  // Создание сессии
  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role
  };
  
  res.json({ 
    message: 'Вход выполнен успешно',
    user: req.session.user
  });
});

// Выход
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка при выходе' });
    }
    res.json({ message: 'Выход выполнен успешно' });
  });
});

// Проверка текущей сессии
app.get('/api/auth/session', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Не авторизован' });
  }
});

// ===== ЗАПУСК СЕРВЕРА =====
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   DOTA 2 RUSSIA WIKI — Server Running ║
╚════════════════════════════════════════╝

🌐 URL: http://localhost:${PORT}
📁 Static files: ./public
💾 Database: ./database

Доступные эндпоинты:
  GET    /api/players
  GET    /api/players/:id
  POST   /api/players (admin)
  PUT    /api/players/:id (admin)
  DELETE /api/players/:id (admin)
  
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/logout
  GET    /api/auth/session

Для входа в админ-панель:
  username: admin
  password: admin123
  `);
});
