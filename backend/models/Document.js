// backend/models/Document.js
const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        required: true
    },
    originalFileName: { // <-- ДОБАВЛЕНО: Оригинальное имя файла с расширением
        type: String,
        required: true // Теперь сделаем обязательным, если оно критично для скачивания
    },
    fileExtension: {    // <-- ДОБАВЛЕНО: Расширение файла (например, 'pdf', 'docx')
        type: String,
        required: true // Теперь сделаем обязательным
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: false });

module.exports = mongoose.model('Document', DocumentSchema);