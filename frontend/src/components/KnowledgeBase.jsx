import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL} from '../App'; // <-- ИЗМЕНЕНИЕ 1: Импортируем базовый URL из App.jsx


function KnowledgeBase({ user }) { // Принимаем пропс user
    const [knowledgeItems, setKnowledgeItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Состояния для формы добавления статьи
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [addMessage, setAddMessage] = useState(''); // Переименовано
    const [deleteMessage, setDeleteMessage] = useState(''); // Для сообщений об удалении

    // Проверяем роль пользователя для условного рендеринга
    const isManagerOrAdmin = user && (user.role === 'manager' || user.role === 'admin');
    const isAdmin = user && user.role === 'admin';

    // Функция для загрузки статей
    const fetchKnowledgeItems = async () => {
        setLoading(true);
        setError(null);
        try {
            // GET /api/knowledge доступен всем
            const response = await axios.get(`${API_URL}/api/knowledge`); // <-- ИЗМЕНЕНИЕ 2
            setKnowledgeItems(response.data);
        } catch (err) {
            console.error('Ошибка при загрузке статей базы знаний:', err);
            setError('Не удалось загрузить статьи.');
        } finally {
            setLoading(false);
        }
    };

    // Загружаем статьи при монтировании компонента
    useEffect(() => {
        fetchKnowledgeItems();
    }, []);

    // Функция для добавления новой статьи
    const handleAddKnowledgeItem = async (e) => {
        e.preventDefault();
        setAddMessage('');
        try {
            // POST /api/knowledge защищен, axios interceptor автоматически добавит токен
            const response = await axios.post(`${API_URL}/api/knowledge`, { // <-- ИЗМЕНЕНИЕ 3
                title: newTitle,
                content: newContent,
                category: newCategory
            });
            setAddMessage('Статья успешно добавлена!');
            setNewTitle('');
            setNewContent('');
            setNewCategory('');
            fetchKnowledgeItems(); // Обновляем список статей
        } catch (err) {
            console.error('Ошибка при добавлении статьи:', err.response?.data || err);
            setAddMessage(err.response?.data?.message || 'Ошибка при добавлении статьи.');
            if (err.response && err.response.status === 401) {
                setAddMessage('Для добавления статьи требуется авторизация.');
            } else if (err.response && err.response.status === 403) {
                setAddMessage('У вас нет прав для добавления статьи.');
            }
        }
    };

    // Функция для удаления статьи
    const handleDeleteKnowledgeItem = async (id) => {
        setDeleteMessage('');
        if (window.confirm('Вы уверены, что хотите удалить эту статью?')) {
            try {
                // DELETE /api/knowledge/:id защищен, axios interceptor автоматически добавит токен
                await axios.delete(`${API_URL}/api/knowledge/${id}`); // <-- ИЗМЕНЕНИЕ 4
                setDeleteMessage('Статья успешно удалена!');
                fetchKnowledgeItems(); // Обновляем список статей
            } catch (err) {
                console.error('Ошибка при удалении статьи:', err.response?.data || err);
                setDeleteMessage(err.response?.data?.message || 'Ошибка при удалении статьи.');
                if (err.response && err.response.status === 401) {
                    setDeleteMessage('Для удаления статьи требуется авторизация.');
                } else if (err.response && err.response.status === 403) {
                    setDeleteMessage('У вас нет прав для удаления статьи.');
                }
            }
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '20px' }}>Загрузка базы знаний...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', marginTop: '20px', color: 'red' }}>{error}</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
            <h2>База знаний</h2>

            {/* Форма для добавления статьи (только для менеджеров и админов) */}
            {isManagerOrAdmin && (
                <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <h3>Добавить новую статью</h3>
                    <form onSubmit={handleAddKnowledgeItem}>
                        {addMessage && <p style={{ color: addMessage.includes('Ошибка') ? 'red' : 'green' }}>{addMessage}</p>}
                        <input
                            type="text"
                            placeholder="Заголовок статьи"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            style={{ width: '95%', padding: '8px', marginBottom: '10px' }}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Категория (например, 'ИТ', 'HR', 'Общее')"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            style={{ width: '95%', padding: '8px', marginBottom: '10px' }}
                        />
                        <textarea
                            placeholder="Содержание статьи"
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            rows="7"
                            style={{ width: '95%', padding: '8px', marginBottom: '10px' }}
                            required
                        ></textarea>
                        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                            Опубликовать статью
                        </button>
                    </form>
                </div>
            )}
            {deleteMessage && <p style={{ color: deleteMessage.includes('Ошибка') ? 'red' : 'green', textAlign: 'center' }}>{deleteMessage}</p>}


            {knowledgeItems.length === 0 ? (
                <p>Пока нет статей в Базе знаний. {isManagerOrAdmin && "Используйте форму выше, чтобы добавить первую статью."}</p>
            ) : (
                <div className="knowledge-list">
                    {knowledgeItems.map((item) => (
                        <div key={item._id} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '15px', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ color: '#333', marginBottom: '5px' }}>{item.title}</h3>
                            {item.category && <p style={{ fontSize: '14px', color: '#555' }}>Категория: {item.category}</p>}
                            <p>{item.content}</p>
                            <p style={{ fontSize: '14px', color: '#888' }}>
                                Автор: {item.author} | Дата: {new Date(item.date).toLocaleDateString()}
                            </p>
                            {isAdmin && ( // Кнопка удаления (только для админов)
                                <button
                                    onClick={() => handleDeleteKnowledgeItem(item._id)}
                                    style={{
                                        marginTop: '10px',
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

export default KnowledgeBase;