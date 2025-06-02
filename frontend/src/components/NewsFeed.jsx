// frontend/src/components/NewsFeed.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; // Убедитесь, что это правильный URL

function NewsFeed({ user }) {
    const [news, setNews] = useState([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [newsImage, setNewsImage] = useState(null); // НОВОЕ СОСТОЯНИЕ ДЛЯ ФАЙЛА ИЗОБРАЖЕНИЯ НОВОСТИ
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formMessage, setFormMessage] = useState('');

    const isManagerOrAdmin = user && (user.role === 'manager' || user.role === 'admin');
    const isAdmin = user && user.role === 'admin';

    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(`${API_URL}/news`);
            setNews(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Ошибка при загрузке новостей:', err);
            setError('Не удалось загрузить новости.');
            setLoading(false);
        }
    };

    // НОВЫЙ ОБРАБОТЧИК ДЛЯ ВЫБОРА ФАЙЛА ИЗОБРАЖЕНИЯ НОВОСТИ
    const handleImageChange = (e) => {
        setNewsImage(e.target.files[0]);
    };

    const handleAddNews = async (e) => {
        e.preventDefault();
        setFormMessage('');

        const formData = new FormData(); // Используем FormData для отправки файлов
        formData.append('title', title);
        formData.append('content', content);
        if (newsImage) {
            formData.append('newsImage', newsImage); // 'newsImage' должно совпадать с именем поля Multer на бэкенде
        }

        try {
            await axios.post(`${API_URL}/news`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data' // Важно для FormData
                }
            });
            setFormMessage('Новость успешно добавлена!');
            setTitle('');
            setContent('');
            setNewsImage(null); // Очищаем выбранный файл
            fetchNews(); // Обновляем список новостей
        } catch (err) {
            console.error('Ошибка при добавлении новости:', err.response?.data || err);
            setFormMessage(err.response?.data?.msg || err.response?.data?.message || 'Ошибка при добавлении новости.');
        }
    };

    const handleDeleteNews = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить эту новость?')) {
            try {
                await axios.delete(`${API_URL}/news/${id}`);
                alert('Новость успешно удалена!');
                fetchNews(); // Обновляем список новостей
            } catch (err) {
                console.error('Ошибка при удалении новости:', err.response?.data || err);
                alert(err.response?.data?.msg || err.response?.data?.message || 'Ошибка при удалении новости.');
            }
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Загрузка новостей...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>{error}</div>;
    }

    const newsCardStyle = {
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
    };

    const newsImageStyle = {
        maxWidth: '100%',
        height: 'auto',
        borderRadius: '4px',
        marginBottom: '10px'
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
            <h2>Лента новостей</h2>

            {isManagerOrAdmin && (
                <form onSubmit={handleAddNews} style={{ marginBottom: '30px', border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <h3>Добавить новую новость</h3>
                    {formMessage && <p style={{ color: formMessage.includes('Ошибка') ? 'red' : 'green' }}>{formMessage}</p>}
                    <input
                        type="text"
                        placeholder="Заголовок новости"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ width: '90%', padding: '8px', marginBottom: '10px' }}
                        required
                    />
                    <textarea
                        placeholder="Содержание новости"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows="5"
                        style={{ width: '90%', padding: '8px', marginBottom: '10px' }}
                        required
                    ></textarea>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Изображение (необязательно):</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ marginBottom: '15px' }}
                    />
                    <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '93%' }}>
                        Опубликовать новость
                    </button>
                </form>
            )}

            <div>
                {news.length === 0 ? (
                    <p>Новостей пока нет.</p>
                ) : (
                    news.map((item) => (
                        <div key={item._id} style={newsCardStyle}>
                            <h3>{item.title}</h3>
                            {item.imageUrl && ( // УСЛОВНЫЙ РЕНДЕРИНГ ИЗОБРАЖЕНИЯ
                                <img src={`http://localhost:5000${item.imageUrl}`} alt={item.title} style={newsImageStyle} />
                            )}
                            <p>{item.content}</p>
                            <small>Автор: {item.author} | Дата: {new Date(item.date).toLocaleDateString()}</small>
                            {isAdmin && ( // Только администратор может удалять новости
                                <button
                                    onClick={() => handleDeleteNews(item._id)}
                                    style={{
                                        background: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 12px',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        marginTop: '10px',
                                        marginLeft: '10px' // Небольшой отступ
                                    }}
                                >
                                    Удалить
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default NewsFeed;