// backend/models/Document.js
const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    category: {
        type: String // Например, 'Регламенты', 'Шаблоны', 'Отчеты'
    },
    fileUrl: { // URL файла на Cloudinary
        type: String,
        required: true
    },
    publicId: { // Public ID файла на Cloudinary (для удаления)
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Document', DocumentSchema);