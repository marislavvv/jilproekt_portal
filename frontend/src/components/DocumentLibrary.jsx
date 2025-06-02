// frontend/src/components/DocumentLibrary.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function DocumentLibrary({ user }) { // Принимаем пропс user
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Состояния для формы добавления документа
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newFile, setNewFile] = useState(null); // Для хранения выбранного файла
    const [addMessage, setAddMessage] = useState(''); // Для сообщений о добавлении
    const [deleteMessage, setDeleteMessage] = useState(''); // Для сообщений об удалении

    // Проверяем роль пользователя для условного рендеринга
    const isManagerOrAdmin = user && (user.role === 'manager' || user.role === 'admin');
    const isAdmin = user && user.role === 'admin';

    // Функция для загрузки документов
    const fetchDocuments = async () => {
        setLoading(true);
        setError(null);
        try {
            // GET /api/documents доступен всем
            const response = await axios.get(`${API_URL}/documents`);
            setDocuments(response.data);
        } catch (err) {
            console.error('Ошибка при загрузке документов:', err);
            setError('Не удалось загрузить документы.');
        } finally {
            setLoading(false);
        }
    };

    // Загружаем документы при монтировании компонента
    useEffect(() => {
        fetchDocuments();
    }, []);

    // Обработчик выбора файла
    const handleFileChange = (e) => {
        setNewFile(e.target.files[0]); // Берем первый выбранный файл
    };

    // Функция для добавления нового документа
    const handleAddDocument = async (e) => {
        e.preventDefault();
        setAddMessage('');

        if (!newFile) {
            setAddMessage('Пожалуйста, выберите файл для загрузки.');
            return;
        }

        // Создаем FormData для отправки файла и других полей формы
        const formData = new FormData();
        formData.append('title', newTitle);
        formData.append('description', newDescription);
        formData.append('category', newCategory);
        formData.append('file', newFile); // 'file' - это имя поля, которое ожидает multer на бэкенде

        try {
            // POST /api/documents защищен, axios interceptor автоматически добавит токен
            const response = await axios.post(`${API_URL}/documents`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data' // Важно для загрузки файлов
                }
            });
            setAddMessage(response.data.message || 'Документ успешно добавлен!');
            // Очищаем форму
            setNewTitle('');
            setNewDescription('');
            setNewCategory('');
            setNewFile(null);
            document.getElementById('fileInput').value = ''; // Очистка input type="file"

            fetchDocuments(); // Обновляем список документов
        } catch (err) {
            console.error('Ошибка при добавлении документа:', err.response?.data || err);
            setAddMessage(err.response?.data?.message || 'Ошибка при добавлении документа.');
            if (err.response && err.response.status === 401) {
                setAddMessage('Для добавления документа требуется авторизация.');
            } else if (err.response && err.response.status === 403) {
                setAddMessage('У вас нет прав для добавления документа.');
            }
        }
    };

    // Функция для удаления документа
    const handleDeleteDocument = async (id) => {
        setDeleteMessage('');
        if (window.confirm('Вы уверены, что хотите удалить этот документ?')) {
            try {
                // DELETE /api/documents/:id защищен, axios interceptor автоматически добавит токен
                await axios.delete(`${API_URL}/documents/${id}`);
                setDeleteMessage('Документ успешно удален!');
                fetchDocuments(); // Обновляем список документов
            } catch (err) {
                console.error('Ошибка при удалении документа:', err.response?.data || err);
                setDeleteMessage(err.response?.data?.message || 'Ошибка при удалении документа.');
                if (err.response && err.response.status === 401) {
                    setDeleteMessage('Для удаления документа требуется авторизация.');
                } else if (err.response && err.response.status === 403) {
                    setDeleteMessage('У вас нет прав для удаления документа.');
                }
            }
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '20px' }}>Загрузка документов...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', marginTop: '20px', color: 'red' }}>{error}</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
            <h2>Библиотека документов</h2>

            {/* Форма для добавления документа (только для менеджеров и админов) */}
            {isManagerOrAdmin && (
                <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f0f8ff' }}>
                    <h3>Загрузить новый документ</h3>
                    <form onSubmit={handleAddDocument}>
                        {addMessage && <p style={{ color: addMessage.includes('Ошибка') ? 'red' : 'green' }}>{addMessage}</p>}
                        <input
                            type="text"
                            placeholder="Название документа"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            style={{ width: '90%', padding: '8px', marginBottom: '10px' }}
                            required
                        />
                        <textarea
                            placeholder="Описание"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            rows="3"
                            style={{ width: '90%', padding: '8px', marginBottom: '10px' }}
                        ></textarea>
                        <input
                            type="text"
                            placeholder="Категория (например, 'Регламенты', 'Шаблоны')"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            style={{ width: '90%', padding: '8px', marginBottom: '10px' }}
                        />
                        <input
                            type="file"
                            id="fileInput" // Добавляем ID для очистки
                            onChange={handleFileChange}
                            style={{ width: '90%', padding: '8px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                            required
                        />
                        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                            Загрузить документ
                        </button>
                    </form>
                </div>
            )}
            {deleteMessage && <p style={{ color: deleteMessage.includes('Ошибка') ? 'red' : 'green', textAlign: 'center' }}>{deleteMessage}</p>}


            {documents.length === 0 ? (
                <p>Пока нет документов в библиотеке. {isManagerOrAdmin && "Используйте форму выше, чтобы загрузить первый документ."}</p>
            ) : (
                <div className="document-list">
                    {documents.map((item) => (
                        <div key={item._id} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '15px', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ color: '#333', marginBottom: '5px' }}>{item.title}</h3>
                            {item.category && <p style={{ fontSize: '14px', color: '#555' }}>Категория: {item.category}</p>}
                            {item.description && <p>{item.description}</p>}
                            <p style={{ fontSize: '14px', color: '#888' }}>
                                Загружено: {new Date(item.uploadDate).toLocaleDateString()}
                            </p>
                            <a href={`${API_URL}/${item.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '10px', padding: '8px 12px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
                                Скачать документ
                            </a>
                            {isAdmin && ( // Кнопка удаления (только для админов)
                                <button
                                    onClick={() => handleDeleteDocument(item._id)}
                                    style={{
                                        marginTop: '10px',
                                        marginLeft: '10px',
                                        padding: '8px 15px',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    Удалить
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DocumentLibrary;