// backend/routes/projects.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize'); // <-- Добавил импорт
const Project = require('../models/Project');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Для удаления файлов

// Создаем директорию для загрузок, если ее нет
// ! ВНИМАНИЕ: Это не будет надежно работать на Render. Рекомендуется использовать Cloudinary/AWS S3
const UPLOADS_DIR = path.join(__dirname, '../uploads/projects');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Настройка Multer для сохранения файлов на диск
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        // Уникальное имя файла
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb('Ошибка: Поддерживаются только изображения (jpeg, jpg, png, gif)!');
    }
}).single('projectImage'); // 'projectImage' - имя поля формы для файла

// @route   POST api/projects
// @desc    Создать новый проект (только для менеджера/админа)
// @access  Private
router.post('/', auth, authorize(['manager', 'admin']), (req, res) => { // <-- Использовал authorize middleware
    upload(req, res, async (err) => {
        if (err) {
            // MulterError или ошибка фильтрации файла
            return res.status(400).json({ msg: err.message || err }); // Возвращаем сообщение об ошибке Multer
        }

        const { title, description, startDate, endDate, departments } = req.body;

        // Если файл не был загружен, но должен был быть (например, если поле пустое)
        if (!req.file) {
            // Если imageUrl не является обязательным полем в вашей модели,
            // то можно разрешить создание проекта без изображения.
            // Но если изображение ожидается, то это ошибка.
            // Например: return res.status(400).json({ msg: 'Изображение проекта обязательно.' });
            // Для гибкости, оставим imageUrl как undefined если файл не загружен
        }


        try {
            const newProject = new Project({
                title,
                description,
                startDate,
                endDate: endDate || null, // Если endDate не передан, устанавливаем null
                departments: Array.isArray(departments) ? departments : (departments ? departments.split(',').map(d => d.trim()) : []), // Улучшенная обработка departments
                imageUrl: req.file ? `/uploads/projects/${req.file.filename}` : undefined // Путь к изображению
            });

            const project = await newProject.save();
            res.json(project);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Ошибка сервера');
        }
    });
});

// @route   GET api/projects/current
// @desc    Получить текущие проекты
// @access  Private
router.get('/current', auth, async (req, res) => {
    try {
        const projects = await Project.find({ isCompleted: false }).sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

// @route   GET api/projects/completed
// @desc    Получить завершенные проекты
// @access  Private
router.get('/completed', auth, async (req, res) => {
    try {
        const projects = await Project.find({ isCompleted: true }).sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

// @route   PUT api/projects/:id/complete
// @desc    Отметить проект как завершенный (только для менеджера/админа)
// @access  Private
router.put('/:id/complete', auth, authorize(['manager', 'admin']), async (req, res) => { // <-- Использовал authorize middleware
    try {
        let project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ msg: 'Проект не найден' });
        }

        project.isCompleted = true;
        project.endDate = new Date(); // Устанавливаем текущую дату завершения

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

// @route   DELETE api/projects/:id
// @desc    Удалить проект (только для админа)
// @access  Private
router.delete('/:id', auth, authorize(['admin']), async (req, res) => { // <-- Использовал authorize middleware
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ msg: 'Проект не найден' });
        }

        // Удаляем изображение, если оно есть
        if (project.imageUrl) {
            const imagePath = path.join(__dirname, '..', project.imageUrl);
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Ошибка при удалении файла изображения:', err);
            });
        }

        await Project.deleteOne({ _id: req.params.id }); // Используем deleteOne для удаления документа
        res.json({ msg: 'Проект удален' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Проект не найден' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router;