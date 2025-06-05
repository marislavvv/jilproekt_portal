// backend/routes/documents.js
const express = require('express');
const mongoose = require('mongoose');

const Document = mongoose.models.Document || mongoose.model('Document');

module.exports = (auth, authorizeManager, authorizeAdmin, uploadDocument, cloudinary) => {
    const router = express.Router();

    // Роут для получения всех документов
    router.get('/', auth, async (req, res) => {
        try {
            const documents = await Document.find().sort({ uploadDate: -1 });
            res.json(documents);
        } catch (err) {
            console.error('Ошибка при получении документов:', err);
            res.status(500).json({ message: err.message });
        }
    });

    // Роут для добавления нового документа
    router.post('/', auth, authorizeManager, uploadDocument.single('documentFile'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: 'Файл не был загружен.' });
        }

        console.log('Данные req.file после загрузки Cloudinary:', req.file); // Для отладки

        const { title, description, category } = req.body;

        // ИСПРАВЛЕНИЕ ЗДЕСЬ: используем req.file.path вместо req.file.secure_url
        const fileUrl = req.file.path; // Используем 'path', так как 'secure_url' отсутствует в логе
        const publicId = req.file.filename; // Используем 'filename' для publicId, как видно из лога
        const originalFileName = req.file.originalname; // Оригинальное имя файла, загруженное пользователем
        const fileExtension = originalFileName.split('.').pop().toLowerCase(); // Извлекаем расширение

        // Проверяем, что необходимые данные получены
        // Теперь проверяем fileUrl (который теперь path)
        if (!fileUrl) {
            console.error('Ошибка: Cloudinary не вернул URL файла (path). Объект req.file:', req.file);
            return res.status(500).json({ message: 'Не удалось получить URL файла от Cloudinary.' });
        }
        if (!publicId) {
            console.error('Ошибка: Cloudinary не вернул public_id (filename). Объект req.file:', req.file);
            return res.status(500).json({ message: 'Не удалось получить Public ID файла от Cloudinary.' });
        }
        if (!originalFileName) {
            console.error('Ошибка: Не удалось получить originalFileName. Объект req.file:', req.file);
            return res.status(500).json({ message: 'Не удалось получить оригинальное имя файла.' });
        }

        const newDocument = new Document({
            title,
            description,
            category,
            fileUrl, // Будет полным URL из `path`
            publicId, // Будет publicId из `filename`
            originalFileName, // Оригинальное имя с расширением
            fileExtension,    // Расширение
            uploadDate: new Date(),
            // uploadedBy: req.user.id // Раскомментируйте, если используете
        });

        try {
            const savedDocument = await newDocument.save();
            res.status(201).json({ message: 'Документ успешно загружен и добавлен.', document: savedDocument });
        } catch (err) {
            // Если произошла ошибка при сохранении в БД, пытаемся удалить файл с Cloudinary
            if (publicId) {
                cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }, (destroyError, destroyResult) => {
                    if (destroyError) console.error('Ошибка при удалении файла из Cloudinary после ошибки БД:', destroyError);
                    console.log('Результат удаления из Cloudinary:', destroyResult);
                });
            }
            console.error('Ошибка при сохранении документа в БД:', err);
            res.status(400).json({ message: err.message || 'Ошибка при сохранении документа.' });
        }
    });

    // Роут для удаления документа
    router.delete('/:id', auth, authorizeAdmin, async (req, res) => {
        try {
            const documentItem = await Document.findById(req.params.id);
            if (!documentItem) {
                return res.status(404).json({ message: 'Документ не найден' });
            }

            if (documentItem.publicId) {
                cloudinary.uploader.destroy(documentItem.publicId, { resource_type: 'raw' }, (error, result) => {
                    if (error) console.error('Ошибка при удалении файла документа из Cloudinary:', error);
                    console.log('Результат удаления из Cloudinary:', result);
                });
            }

            await Document.findByIdAndDelete(req.params.id);
            res.json({ message: 'Документ успешно удален' });
        } catch (err) {
            console.error('Ошибка при удалении документа:', err);
            res.status(500).json({ message: 'Ошибка сервера при удалении документа' });
        }
    });

    return router;
};