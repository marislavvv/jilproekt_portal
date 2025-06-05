// backend/routes/documents.js
const express = require('express');
const mongoose = require('mongoose'); // Обязательно импортируйте mongoose здесь

// Используем mongoose.models.Document для получения уже скомпилированной модели
// Это предотвращает OverwriteModelError, так как модель Document должна быть определена в server.js
const Document = mongoose.models.Document || mongoose.model('Document');

// exportруем функцию, которая принимает необходимые middleware и объекты
module.exports = (auth, authorizeManager, authorizeAdmin, uploadDocument, cloudinary) => {
    const router = express.Router();

    // Роут для получения всех документов
    router.get('/', auth, async (req, res) => {
        try {
            const documents = await Document.find().sort({ uploadDate: -1 });
            res.json(documents);
        } catch (err) {
            console.error('Ошибка при получении документов:', err); // Добавим лог для отладки
            res.status(500).json({ message: err.message });
        }
    });

    // Роут для добавления нового документа
    router.post('/', auth, authorizeManager, uploadDocument.single('documentFile'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: 'Файл не был загружен.' });
        }

        const { title, description, category } = req.body;
        const fileUrl = req.file.path; // Полный HTTPS URL, который возвращает Cloudinary
        const publicId = req.file.filename;

        const newDocument = new Document({
            title,
            description,
            category,
            fileUrl,
            publicId
        });

        try {
            const savedDocument = await newDocument.save();
            res.status(201).json({ message: 'Документ успешно загружен и добавлен.', document: savedDocument });
        } catch (err) {
            // Если произошла ошибка при сохранении в БД, пытаемся удалить файл с Cloudinary
            if (req.file && req.file.filename) {
                cloudinary.uploader.destroy(req.file.filename, { resource_type: 'raw' }, (destroyError, destroyResult) => {
                    if (destroyError) console.error('Ошибка при удалении файла из Cloudinary после ошибки БД:', destroyError);
                    console.log('Результат удаления из Cloudinary:', destroyResult);
                });
            }
            console.error('Ошибка при сохранении документа в БД:', err);
            res.status(400).json({ message: err.message });
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