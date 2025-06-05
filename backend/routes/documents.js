// backend/routes/documents.js
const express = require('express');
const Document = require('../models/Document'); // Вам нужно будет импортировать модель Document
// Возможно, вам придется импортировать Cloudinary здесь, если он используется в этом файле
// const cloudinary = require('cloudinary').v2; // Или передать его из server.js

module.exports = (auth, authorizeManager, authorizeAdmin, uploadDocument, cloudinary) => { // Принимаем функции
    const router = express.Router();

    // Пример роута для документов, использующего переданные middleware
    router.get('/', auth, async (req, res) => {
        try {
            const documents = await Document.find().sort({ uploadDate: -1 });
            res.json(documents);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });

    router.post('/', auth, authorizeManager, uploadDocument.single('documentFile'), async (req, res) => {
        // Весь код вашего POST /api/documents роута
        if (!req.file) {
            return res.status(400).json({ message: 'Файл не был загружен.' });
        }

        const { title, description, category } = req.body;
        const fileUrl = req.file.path;
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

    router.delete('/:id', auth, authorizeAdmin, async (req, res) => {
        // Весь код вашего DELETE /api/documents/:id роута
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