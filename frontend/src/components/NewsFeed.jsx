import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../App'; // Импортируем базовый URL из App.jsx

function NewsFeed({ user }) {
    const [news, setNews] = useState([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [newsImage, setNewsImage] = useState(null);
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
            const response = await axios.get(`${API_URL}/api/news`);
            setNews(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Ошибка при загрузке новостей:', err);
            setError('Не удалось загрузить новости.');
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        setNewsImage(e.target.files[0]);
    };

    const handleAddNews = async (e) => {
        e.preventDefault();
        setFormMessage('');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        if (newsImage) {
            formData.append('newsImage', newsImage);
        }

        try {
            // Добавляем токен авторизации
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/news`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-auth-token': token // Добавляем токен авторизации
                }
            });
            setFormMessage('Новость успешно добавлена!');
            setTitle('');
            setContent('');
            setNewsImage(null);
            fetchNews();
        } catch (err) {
            console.error('Ошибка при добавлении новости:', err.response?.data || err);
            setFormMessage(err.response?.data?.msg || err.response?.data?.message || 'Ошибка при добавлении новости.');
        }
    };

    const handleDeleteNews = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить эту новость?')) {
            try {
                // Добавляем токен авторизации
                const token = localStorage.getItem('token');
                await axios.delete(`${API_URL}/api/news/${id}`, {
                    headers: {
                        'x-auth-token': token // Добавляем токен авторизации
                    }
                });
                alert('Новость успешно удалена!');
                fetchNews();
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
                            {item.imageUrl && (
                                // ИСПРАВЛЕНИЕ: Используем item.imageUrl напрямую, так как он уже является полным URL из Cloudinary
                                <img src={item.imageUrl} alt={item.title} style={newsImageStyle} />
                            )}
                            <p>{item.content}</p>
                            <small>Автор: {item.author} | Дата: {new Date(item.date).toLocaleDateString()}</small>
                            {isAdmin && (
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
                                        marginLeft: '10px'
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