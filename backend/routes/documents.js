// backend/routes/documents.js
const express = require('express');
const mongoose = require('mongoose');

const Document = mongoose.models.Document || mongoose.model('Document');

module.exports = (auth, authorizeManager, authorizeAdmin, uploadDocument, cloudinary) => {
    const router = express.Router();

    // Роут для получения всех документов
    router.get('/', auth, async (req, res) => {
        try {
            // Убедитесь, что 'uploadDate' используется в вашей схеме Document
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

        // --- ВАЖНОЕ ДОБАВЛЕНИЕ ДЛЯ ОТЛАДКИ ---
        // Вывод всех данных, которые Multer-Cloudinary возвращает в req.file
        console.log('Данные req.file после загрузки Cloudinary:', req.file);
        // --- КОНЕЦ ОТЛАДКИ ---

        const { title, description, category } = req.body;

        // ИСПРАВЛЕНИЕ: Используйте правильные свойства из req.file,
        // которые предоставляет `multer-storage-cloudinary`
        const fileUrl = req.file.secure_url; // Полный HTTPS URL файла на Cloudinary
        const publicId = req.file.public_id; // Public ID файла на Cloudinary (включает путь и имя)
        const originalFileName = req.file.originalname; // Оригинальное имя файла, загруженное пользователем (например, "отчет.pdf")

        // Проверяем, что необходимые данные получены
        if (!fileUrl) {
            console.error('Ошибка: Cloudinary не вернул secure_url. Объект req.file:', req.file);
            // Если secure_url пуст, это может быть из-за проблем с ключами Cloudinary или их настройками.
            return res.status(500).json({ message: 'Не удалось получить URL файла от Cloudinary.' });
        }
        if (!publicId) {
            console.error('Ошибка: Cloudinary не вернул public_id. Объект req.file:', req.file);
            return res.status(500).json({ message: 'Не удалось получить Public ID файла от Cloudinary.' });
        }
        if (!originalFileName) {
            console.error('Ошибка: Не удалось получить originalFileName. Объект req.file:', req.file);
            return res.status(500).json({ message: 'Не удалось получить оригинальное имя файла.' });
        }

        // Извлекаем расширение из originalFileName
        const fileExtension = originalFileName.split('.').pop().toLowerCase();

        const newDocument = new Document({
            title,
            description,
            category,
            fileUrl,
            publicId,
            originalFileName, // СОХРАНЯЕМ ОРИГИНАЛЬНОЕ ИМЯ
            fileExtension,    // СОХРАНЯЕМ РАСШИРЕНИЕ
            uploadDate: new Date(), // Время загрузки документа
            // Добавьте uploadedBy, если это поле есть в вашей схеме и `req.user` доступен
            // uploadedBy: req.user.id
        });

        try {
            const savedDocument = await newDocument.save();
            res.status(201).json({ message: 'Документ успешно загружен и добавлен.', document: savedDocument });
        } catch (err) {
            // Если произошла ошибка при сохранении в БД, пытаемся удалить файл с Cloudinary
            if (publicId) { // Используем publicId для удаления
                cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }, (destroyError, destroyResult) => {
                    if (destroyError) console.error('Ошибка при удалении файла из Cloudinary после ошибки БД:', destroyError);
                    console.log('Результат удаления из Cloudinary:', destroyResult);
                });
            }
            console.error('Ошибка при сохранении документа в БД:', err);
            // Возвращаем ошибку валидации, если она есть
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

            // Удаляем файл из Cloudinary, если publicId существует
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