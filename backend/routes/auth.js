const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '../data/users.json');

function getUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUser = {
      id: 1,
      email: 'admin@monprojetimmo.fr',
      password: bcrypt.hashSync('Admin123!', 10),
      name: 'Administrateur',
      role: 'admin'
    };
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify([defaultUser], null, 2));
    return [defaultUser];
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '24h' }
  );
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const users = getUsers();
  const user = users.find(u => u.email === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = createToken(user);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

router.post('/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  const users = getUsers();
  if (users.find(u => u.email === email.toLowerCase())) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });
  }

  const newUser = {
    id: Date.now(),
    email: email.toLowerCase(),
    password: bcrypt.hashSync(password, 10),
    name,
    role: 'user'
  };

  users.push(newUser);
  saveUsers(users);

  const token = createToken(newUser);
  res.status(201).json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role } });
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Non authentifié' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    res.json({ user: decoded });
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

module.exports = router;
