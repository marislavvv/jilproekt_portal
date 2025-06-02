// backend/server.js
require('dotenv').config(); // Загружаем переменные окружения из .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Для хеширования паролей
const jwt = require('jsonwebtoken'); // Для создания JWT
const multer = require('multer'); // Для загрузки файлов
const path = require('path'); // Для работы с путями файлов
const fs = require('fs'); // Для работы с файловой системой (например, для удаления файлов)
const http = require('http'); // НОВОЕ: Импортируем модуль http
const { Server } = require('socket.io'); // НОВОЕ: Импортируем Server из socket.io

const app = express();
// НОВОЕ: Создаем HTTP-сервер из нашего Express-приложения
const server = http.createServer(app);
const PORT = process.env.PORT || 5000; // Порт для бэкенда, по умолчанию 5000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/jilproekt_db';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_please_change_this_in_production';

// Определяем разрешенный источник для CORS
// Теперь FRONTEND_URL из .env будет использоваться, если он есть,
// иначе по умолчанию будет 'http://localhost:5173'
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

// НОВОЕ: Инициализируем Socket.IO и привязываем его к HTTP-серверу
const io = new Server(server, {
    cors: {
        origin: allowedOrigin, // <-- ИЗМЕНЕНО: Используем переменную allowedOrigin
        methods: ["GET", "POST"],
        credentials: true // Важно для передачи токенов
    }
});

// --- Промежуточное ПО (Middleware) ---
// Разрешаем запросы с фронтенда для обычных HTTP-запросов (axios)
app.use(cors({
  origin: allowedOrigin, // <-- ИЗМЕНЕНО: Используем переменную allowedOrigin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true // Важно для передачи куки и заголовков авторизации
}));
app.use(express.json()); // Позволяет Express парсить JSON-тела запросов

// Настройка хранилища Multer для загрузки файлов документов
const documentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/documents/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
    }
});
const uploadDocument = multer({ storage: documentStorage });

// Настройка хранилища Multer для загрузки файлов изображений проектов
const projectImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/projects/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
    }
});
const uploadProjectImage = multer({
    storage: projectImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb('Ошибка: Поддерживаются только изображения (jpeg, jpg, png, gif)!');
    }
}).single('projectImage');

// --- НОВАЯ НАСТРОЙКА MULTER ДЛЯ ИЗОБРАЖЕНИЙ НОВОСТЕЙ ---
const newsImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/news/'; // Отдельная папка для изображений новостей
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
    }
});

const uploadNewsImage = multer({
    storage: newsImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb('Ошибка: Поддерживаются только изображения (jpeg, jpg, png, gif)!');
    }
}).single('newsImage'); // 'newsImage' - имя поля формы для файла новости

// Отдаем статические файлы из папок uploads/documents, uploads/projects И uploads/news
app.use('/uploads/documents', express.static(path.join(__dirname, 'uploads', 'documents')));
app.use('/uploads/projects', express.static(path.join(__dirname, 'uploads', 'projects')));
app.use('/uploads/news', express.static(path.join(__dirname, 'uploads', 'news'))); // Добавлено для изображений новостей

// --- Подключение к MongoDB ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB успешно подключена!'))
    .catch(err => console.error('Ошибка подключения к MongoDB:', err));

// --- Определение схем и моделей Mongoose (для структуры данных в БД) ---

// Схема для новостей (ОБНОВЛЕНА)
const NewsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, default: 'Администратор' },
    imageUrl: { type: String, required: false }, // НОВОЕ ПОЛЕ ДЛЯ ИЗОБРАЖЕНИЯ НОВОСТИ
    date: { type: Date, default: Date.now }
});
const News = mongoose.model('News', NewsSchema);

// Схема для документов (регламенты, шаблоны)
const DocumentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    category: String,
    fileUrl: { type: String, required: true }, // Путь к файлу на сервере
    uploadDate: { type: Date, default: Date.now }
});
const Document = mongoose.model('Document', DocumentSchema);

// Схема для заявок (отпуск, командировка, техподдержка)
const RequestSchema = new mongoose.Schema({
    type: { type: String, required: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    details: String,
    status: { type: String, default: 'Ожидает' },
    submissionDate: { type: Date, default: Date.now },
    startDate: Date,
    endDate: Date,
    assignedTo: String
});
const Request = mongoose.model('Request', RequestSchema);

// Схема для элементов Базы знаний
const KnowledgeItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: String,
    author: { type: String, default: 'Администратор' },
    date: { type: Date, default: Date.now }
});
const KnowledgeItem = mongoose.model('KnowledgeItem', KnowledgeItemSchema);

// Схема для профиля пользователя (для аутентификации)
const UserProfileSchema = new mongoose.Schema({
    employeeId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    position: String,
    department: String,
    password: { type: String, required: true },
    role: { type: String, default: 'employee', enum: ['employee', 'manager', 'admin'] }
});
const UserProfile = mongoose.model('UserProfile', UserProfileSchema);

// Схема для Проектов
const ProjectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: false
    },
    departments: {
        type: [String],
        required: true
    },
    imageUrl: {
        type: String,
        required: false
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const Project = mongoose.model('Project', ProjectSchema);

// НОВАЯ СХЕМА: Сообщения чата
const ChatMessageSchema = new mongoose.Schema({
    department: { type: String, required: true }, // Отдел, к которому относится сообщение
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);


// --- Промежуточное ПО для защиты роутов (авторизация и роли) ---

function auth(req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ message: 'Нет токена, авторизация отклонена' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.userInfo;
        next();
    } catch (e) {
        res.status(401).json({ message: 'Токен не валиден' });
    }
}

function authorizeManager(req, res, next) {
    if (req.user && (req.user.role === 'manager' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Доступ запрещен. Требуется роль менеджера или администратора.' });
    }
}

function authorizeAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Доступ запрещен. Требуется роль администратора.' });
    }
}

// --- Socket.IO логика ---
io.on('connection', (socket) => {
    console.log('Новый клиент подключился к Socket.IO:', socket.id);

    // Обработка присоединения к комнате отдела
    socket.on('joinDepartmentChat', async (data) => {
        const { token, department } = data;

        if (!token || !department) {
            socket.emit('chatError', 'Отсутствует токен или название отдела.');
            return;
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = decoded.userInfo; // user = { id, employeeId, name, role }

            // Проверяем, принадлежит ли пользователь к запрашиваемому отделу
            const userProfile = await UserProfile.findById(user.id);
            if (!userProfile || userProfile.department !== department) {
                socket.emit('chatError', 'Доступ запрещен: Вы не принадлежите к этому отделу.');
                return;
            }

            // Отсоединяемся от предыдущих комнат, если таковые были
            // Это важно, чтобы пользователь не "висел" в нескольких чатах одновременно
            socket.rooms.forEach(room => {
                if (room !== socket.id) { // Не отключаем от собственной комнаты сокета
                    socket.leave(room);
                    console.log(`Socket ${socket.id} покинул комнату ${room}`);
                }
            });

            socket.join(department); // Присоединяем сокет к комнате, названной по отделу
            console.log(`Пользователь ${user.name} (${user.employeeId}) присоединился к чату отдела: ${department}`);

            // Отправляем пользователю историю сообщений для этого отдела
            const messages = await ChatMessage.find({ department }).sort({ timestamp: 1 }).limit(50); // Последние 50 сообщений
            socket.emit('chatHistory', messages);

            socket.emit('joinSuccess', `Вы присоединились к чату отдела "${department}"`);

        } catch (err) {
            console.error('Ошибка при присоединении к чату отдела:', err.message);
            socket.emit('chatError', 'Ошибка аутентификации или авторизации при входе в чат.');
        }
    });

    // Обработка нового сообщения
    socket.on('sendMessage', async (data) => {
        const { token, department, message } = data;

        if (!token || !department || !message) {
            socket.emit('chatError', 'Неполные данные для отправки сообщения.');
            return;
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = decoded.userInfo;

            // Дополнительная проверка, чтобы убедиться, что пользователь действительно в комнате этого отдела
            const userProfile = await UserProfile.findById(user.id);
            if (!userProfile || userProfile.department !== department) {
                socket.emit('chatError', 'Несанкционированная попытка отправить сообщение в этот отдел.');
                return;
            }

            // Сохраняем сообщение в базу данных
            const newMessage = new ChatMessage({
                department,
                senderId: user.employeeId,
                senderName: user.name,
                message,
                timestamp: new Date()
            });
            await newMessage.save();

            // Отправляем сообщение всем в комнате этого отдела
            io.to(department).emit('receiveMessage', {
                department,
                senderId: user.employeeId,
                senderName: user.name,
                message,
                timestamp: newMessage.timestamp // Используем время из БД
            });
        } catch (err) {
            console.error('Ошибка при отправке сообщения:', err.message);
            socket.emit('chatError', 'Ошибка при отправке сообщения.');
        }
    });

    socket.on('disconnect', () => {
        console.log('Клиент отключился от Socket.IO:', socket.id);
    });
});


// --- API-роуты ---

// --- Роуты для Аутентификации ---
app.post('/api/auth/register', async (req, res) => {
    const { employeeId, name, position, department, password, role } = req.body;
    try {
        let user = await UserProfile.findOne({ employeeId });
        if (user) {
            return res.status(400).json({ message: 'Сотрудник с таким ID уже зарегистрирован' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new UserProfile({
            employeeId,
            name,
            position,
            department,
            password: hashedPassword,
            role: role || 'employee'
        });

        await user.save();

        const payload = {
            userInfo: {
                id: user.id,
                employeeId: user.employeeId,
                name: user.name,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '20000000000000h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, message: 'Пользователь успешно зарегистрирован', employeeId: user.employeeId, name: user.name, role: user.role, position: user.position, department: user.department });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера при регистрации');
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { employeeId, password } = req.body;
    try {
        let user = await UserProfile.findOne({ employeeId });
        if (!user) {
            return res.status(400).json({ message: 'Неверный ID сотрудника или пароль' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Неверный ID сотрудника или пароль' });
        }

        const payload = {
            userInfo: {
                id: user.id,
                employeeId: user.employeeId,
                name: user.name,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '20000000000000h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, message: 'Успешный вход', employeeId: user.employeeId, name: user.name, role: user.role, position: user.position, department: user.department });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера при входе');
    }
});

app.get('/api/auth/me', auth, async (req, res) => {
    try {
        const user = await UserProfile.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        res.json({ id: user.id, employeeId: user.employeeId, name: user.name, role: user.role, position: user.position, department: user.department });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера при получении данных пользователя');
    }
});


// --- Роуты для Новостей (ОБНОВЛЕНЫ) ---
app.get('/api/news', async (req, res) => {
    try {
        const news = await News.find().sort({ date: -1 });
        res.json(news);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/news', auth, authorizeManager, (req, res) => { // Используем uploadNewsImage
    uploadNewsImage(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ msg: err });
        }

        const { title, content } = req.body;
        const imageUrl = req.file ? `/uploads/news/${req.file.filename}` : undefined; // Путь к изображению

        const newNews = new News({
            title,
            content,
            author: req.user.name || req.user.employeeId || 'Авторизованный пользователь',
            imageUrl // Сохраняем URL изображения
        });

        try {
            const savedNews = await newNews.save();
            res.status(201).json(savedNews);
        } catch (err) {
            // Если произошла ошибка при сохранении в БД, удаляем загруженный файл
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Ошибка при удалении загруженного файла новости:', unlinkErr);
                });
            }
            console.error('Ошибка при сохранении новости:', err);
            res.status(400).json({ message: err.message });
        }
    });
});

app.delete('/api/news/:id', auth, authorizeAdmin, async (req, res) => {
    try {
        const newsItem = await News.findById(req.params.id); // Ищем новость по ID
        if (!newsItem) {
            return res.status(404).json({ message: 'Новость не найдена' });
        }

        // Если у новости есть изображение, удаляем его с диска
        if (newsItem.imageUrl) {
            const imagePath = path.join(__dirname, newsItem.imageUrl);
            fs.unlink(imagePath, (unlinkErr) => {
                if (unlinkErr) console.error('Ошибка при удалении файла изображения новости:', unlinkErr);
            });
        }

        await News.findByIdAndDelete(req.params.id); // Удаляем новость из БД
        res.json({ message: 'Новость успешно удалена' });
    } catch (err) {
        console.error('Ошибка при удалении новости:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении новости' });
    }
});


// --- Роуты для Документов ---
app.get('/api/documents', async (req, res) => {
    try {
        const documents = await Document.find().sort({ uploadDate: -1 });
        res.json(documents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
app.post('/api/documents', auth, authorizeManager, uploadDocument.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Файл не был загружен.' });
    }

    const { title, description, category } = req.body;
    const fileUrl = `/uploads/documents/${req.file.filename}`;

    const newDocument = new Document({
        title,
        description,
        category,
        fileUrl
    });

    try {
        const savedDocument = await newDocument.save();
        res.status(201).json({ message: 'Документ успешно загружен и добавлен.', document: savedDocument });
    } catch (err) {
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Ошибка при удалении загруженного файла:', unlinkErr);
            });
        }
        console.error('Ошибка при сохранении документа в БД:', err);
        res.status(400).json({ message: err.message });
    }
});
app.delete('/api/documents/:id', auth, authorizeAdmin, async (req, res) => {
    try {
        const documentItem = await Document.findById(req.params.id);
        if (!documentItem) {
            return res.status(404).json({ message: 'Документ не найден' });
        }

        const filePath = path.join(__dirname, documentItem.fileUrl);
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Ошибка при удалении файла с диска:', unlinkErr);
            });
        }

        await Document.findByIdAndDelete(req.params.id);
        res.json({ message: 'Документ успешно удален' });
    } catch (err) {
        console.error('Ошибка при удалении документа:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении документа' });
    }
});


// --- Роуты для Заявок ---
app.get('/api/requests/me', auth, async (req, res) => {
    try {
        const requests = await Request.find({ employeeId: req.user.employeeId }).sort({ submissionDate: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
app.post('/api/requests', auth, async (req, res) => {
    const newRequest = new Request({
        ...req.body,
        employeeId: req.user.employeeId,
        employeeName: req.user.name || req.user.employeeId
    });
    try {
        const savedRequest = await newRequest.save();
        res.status(201).json(savedRequest);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.get('/api/requests/all', auth, authorizeManager, async (req, res) => {
    try {
        const requests = await Request.find().sort({ submissionDate: -1 });
        res.json(requests);
    } catch (err) {
        console.error('Ошибка при получении всех заявок:', err);
        res.status(500).json({ message: 'Ошибка сервера при получении всех заявок' });
    }
});

app.put('/api/requests/:id/status', auth, authorizeManager, async (req, res) => {
    const { id } = req.params;
    const { status, assignedTo } = req.body;

    try {
        const request = await Request.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Заявка не найдена' });
        }

        if (status !== undefined) {
            request.status = status;
        }
        if (assignedTo !== undefined) {
            request.assignedTo = assignedTo;
        }

        await request.save();
        res.json({ message: 'Заявка успешно обновлена', request });
    } catch (err) {
        console.error('Ошибка при обновлении статуса заявки:', err);
        res.status(500).json({ message: 'Ошибка сервера при обновлении статуса заявки' });
    }
});


// --- Роуты для Базы знаний ---
app.get('/api/knowledge', async (req, res) => {
    try {
        const items = await KnowledgeItem.find().sort({ date: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
app.post('/api/knowledge', auth, authorizeManager, async (req, res) => {
    const newItem = new KnowledgeItem({ ...req.body, author: req.user.name || req.user.employeeId || 'Авторизованный пользователь' });
    try {
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});
app.delete('/api/knowledge/:id', auth, authorizeAdmin, async (req, res) => {
    try {
        const knowledgeItem = await KnowledgeItem.findByIdAndDelete(req.params.id);
        if (!knowledgeItem) {
            return res.status(404).json({ message: 'Статья Базы знаний не найдена' });
        }
        res.json({ message: 'Статья Базы знаний успешно удалена' });
    } catch (err) {
        console.error('Ошибка при удалении статьи Базы знаний:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении статьи Базы знаний' });
    }
});


// --- Роуты для Профиля сотрудника ---
app.get('/api/profile/me', auth, async (req, res) => {
    try {
        const user = await UserProfile.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'Профиль не найден' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера при получении профиля');
    }
});

app.put('/api/profile/me', auth, async (req, res) => {
    const { name, position, department } = req.body;
    try {
        let profile = await UserProfile.findById(req.user.id);
        if (!profile) return res.status(404).json({ message: 'Профиль не найден' });

        profile.name = name !== undefined ? name : profile.name;
        profile.position = position !== undefined ? position : profile.position;
        profile.department = department !== undefined ? department : profile.department;

        await profile.save();
        res.json({ message: 'Профиль успешно обновлен', profile: { id: profile.id, employeeId: profile.employeeId, name: profile.name, position: profile.position, department: profile.department, role: profile.role } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера при обновлении профиля');
    }
});


// --- Роуты для Поиска ---
app.get('/api/search/news', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(200).json([]);
        }
        const regex = new RegExp(query, 'i');
        const news = await News.find({
            $or: [
                { title: { $regex: regex } },
                { content: { $regex: regex } }
            ]
        }).sort({ date: -1 });
        res.json(news);
    } catch (err) {
        console.error('Ошибка поиска новостей:', err);
        res.status(500).json({ message: 'Ошибка сервера при поиске новостей' });
    }
});

app.get('/api/search/documents', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(200).json([]);
        }
        const regex = new RegExp(query, 'i');
        const documents = await Document.find({
            $or: [
                { title: { $regex: regex } },
                { description: { $regex: regex } },
                { category: { $regex: regex } }
            ]
        }).sort({ uploadDate: -1 });
        res.json(documents);
    } catch (err) {
        console.error('Ошибка поиска документов:', err);
        res.status(500).json({ message: 'Ошибка сервера при поиске документов' });
    }
});

app.get('/api/search/knowledge', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(200).json([]);
        }
        const regex = new RegExp(query, 'i');
        const knowledgeItems = await KnowledgeItem.find({
            $or: [
                { title: { $regex: regex } },
                { content: { $regex: regex } },
                { category: { $regex: regex } }
            ]
        }).sort({ date: -1 });
        res.json(knowledgeItems);
    } catch (err) {
        console.error('Ошибка поиска статей базы знаний:', err);
        res.status(500).json({ message: 'Ошибка сервера при поиске статей' });
    }
});

// --- Роуты для Проектов ---
app.post('/api/projects', auth, (req, res) => {
    uploadProjectImage(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ msg: err });
        }

        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Доступ запрещен: Только менеджеры или администраторы могут создавать проекты.' });
        }

        const { title, description, startDate, endDate, departments } = req.body;

        try {
            const newProject = new Project({
                title,
                description,
                startDate,
                endDate: endDate || null,
                departments: Array.isArray(departments) ? departments : departments.split(',').map(d => d.trim()),
                imageUrl: req.file ? `/uploads/projects/${req.file.filename}` : undefined
            });

            const project = await newProject.save();
            res.json(project);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Ошибка сервера');
        }
    });
});

app.get('/api/projects/current', auth, async (req, res) => {
    try {
        const projects = await Project.find({ isCompleted: false }).sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

app.get('/api/projects/completed', auth, async (req, res) => {
    try {
        const projects = await Project.find({ isCompleted: true }).sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

app.put('/api/projects/:id/complete', auth, authorizeManager, async (req, res) => {
    try {
        let project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ msg: 'Проект не найден' });
        }

        project.isCompleted = true;
        project.endDate = new Date();

        await project.save();
        res.json(project);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Проект не найден' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

app.delete('/api/projects/:id', auth, authorizeAdmin, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ msg: 'Проект не найден' });
        }

        if (project.imageUrl) {
            const imagePath = path.join(__dirname, project.imageUrl);
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Ошибка при удалении файла изображения:', err);
            });
        }

        await Project.deleteOne({ _id: req.params.id });
        res.json({ msg: 'Проект удален' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Проект не найден' });
        }
        res.status(500).send('Ошибка сервера');
    }
});


// --- Запуск сервера ---
// ВНИМАНИЕ: Теперь слушаем `server`, а не `app`!
server.listen(PORT, () => {
    console.log(`Сервер бэкенда запущен на порту ${PORT}`);
    console.log(`Доступен по адресу: http://localhost:${PORT}`);
    console.log(`Socket.IO доступен по адресу: ws://localhost:${PORT}`);
});