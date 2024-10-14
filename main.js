const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const fs = require("fs");
const XLSX = require("xlsx");
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET_KEY = "super-secret";

const USERS_FILE = "./database/users.xlsx";
const CHATS_FILE = "./database/chats.xlsx";

const loadUsersFromExcel = (filePath = USERS_FILE) => {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
};

const saveUsersToExcel = (data, filePath = USERS_FILE) => {
  const newWB = XLSX.utils.book_new();
  const newWS = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(newWB, newWS, "Sheet1");
  XLSX.writeFile(newWB, filePath);
};

let users = loadUsersFromExcel();
let messages = loadUsersFromExcel(CHATS_FILE);

const tokenRequired = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
};

app.get("/api/users", (req, res) => {
  res.json(users);
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;

  if (users.find((user) => user.name === username)) {
    return res.status(200).json({ error: "Foydalanuvchi allaqachon mavjud" });
  }

  const token = jwt.sign({ username }, JWT_SECRET_KEY);
  const newUser = { name: username, password, token };

  users.push(newUser);
  saveUsersToExcel(users);

  res
    .status(201)
    .json({ message: "Foydalanuvchi muvaffaqiyatli ro'yxatdan o'tkazildi" });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (user) => user.name === username && user.password === password
  );
  if (user) {
    const accessToken = jwt.sign({ username }, JWT_SECRET_KEY);
    const refreshToken = jwt.sign({ username }, JWT_SECRET_KEY);
    return res
      .status(200)
      .json({ access_token: accessToken, refresh_token: refreshToken });
  }

  res.status(200).json({ error: "Invalid username or password" });
});

app.post("/api/check/token", (req, res) => {
  const { token } = req.body;

  try {
    jwt.verify(token, JWT_SECRET_KEY);
    res.status(200).json({ valid: true });
  } catch (e) {
    res.status(401).json({ valid: false, error: e.message });
  }
});

app.post("/api/send", (req, res) => {
  const { text, who } = req.body;
  messages = loadUsersFromExcel(CHATS_FILE);

  const newMessage = { sender: who, message: text };
  messages.push(newMessage);

  saveUsersToExcel(messages, CHATS_FILE);

  res.status(201).json({ message: "Message successfully saved" });
});

app.get("/api/messages", (req, res) => {
  try {
    messages = loadUsersFromExcel(CHATS_FILE);
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/user", (req, res) => {
  const { username } = req.body;

  const user = users.find((user) => user.name === username);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: "Foydalanuvchi topilmadi" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
