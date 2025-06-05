// backend/routes/documents.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const Document = require('../models/Document'); // Убедитесь, что у вас есть такая модель
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Настройка Cloudinary (убедитесь, что переменные окружения установлены на Render)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Настройка CloudinaryStorage для документов
const storageDocuments = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'jilproekt_documents', // Папка в Cloudinary для ваших документов
        resource_type: 'raw', // Важно для файлов, которые не являются изображениями (pdf, docx и т.д.)
        format: async (req, file) => file.mimetype.split('/')[1] || 'bin' // Получаем расширение из mimetype или 'bin'
    }
});

const uploadDocument = multer({ storage: storageDocuments });

// @route   POST api/documents
// @desc    Загрузить новый документ (только для менеджера/админа)
// @access  Private
router.post(
    '/',
    auth,
    authorize(['manager', 'admin']),
    uploadDocument.single('documentFile'), // <-- Multer ожидает поле с именем 'documentFile'
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ msg: 'Файл документа не загружен или имеет недопустимый тип.' });
            }

            const { title, description, category } = req.body;

            // Создание нового документа в MongoDB
            const newDocument = new Document({
                title,
                description,
                category,
                fileUrl: req.file.path,     // URL файла на Cloudinary
                publicId: req.file.filename, // Public ID для Cloudinary (для удаления)
                uploadedBy: req.user.id,     // ID пользователя из JWT токена
                uploadedAt: new Date()       // Дата загрузки
            });

            const document = await newDocument.save();
            res.status(201).json({ message: 'Документ успешно загружен!', document });
        } catch (err) {
            console.error('Ошибка при загрузке документа:', err.message);
            res.status(500).json({ msg: 'Ошибка сервера при загрузке документа.' });
        }
    }
);

// @route   GET api/documents
// @desc    Получить все документы
// @access  Private (можно сделать публичным, если документы доступны всем без авторизации)
router.get('/', auth, async (req, res) => {
    try {
        const documents = await Document.find().sort({ uploadedAt: -1 });
        res.json(documents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

// @route   DELETE api/documents/:id
// @desc    Удалить документ (только для админа)
// @access  Private
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ msg: 'Документ не найден' });
        }

        // Удаляем файл из Cloudinary
        if (document.publicId) {
            await cloudinary.uploader.destroy(document.publicId, { resource_type: 'raw' });
        }

        await Document.deleteOne({ _id: req.params.id });
        res.json({ msg: 'Документ удален' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Документ не найден' });
        }
        res.status(500).send('Ошибка сервера');
    }
});


module.exports = router;