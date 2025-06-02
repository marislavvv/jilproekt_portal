import React, { useState } from 'react';
import axios from 'axios';
import { API_URL_BASE } from '../App'; // <-- ИЗМЕНЕНИЕ 1: Импортируем базовый URL из App.jsx

// Удалите или закомментируйте эту строку
// const API_URL = 'http://localhost:5000/api';

function GlobalSearch({ onNavigateToPage }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState({
        news: [],
        documents: [],
        knowledge: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        setSearchResults({ news: [], documents: [], knowledge: [] }); // Очищаем предыдущие результаты

        if (!searchTerm.trim()) {
            setLoading(false);
            return; // Не ищем, если запрос пустой
        }

        try {
            const [newsRes, docsRes, knowledgeRes] = await Promise.all([
                axios.get(`${API_URL_BASE}/search/news?q=${searchTerm}`), // <-- ИЗМЕНЕНИЕ 2
                axios.get(`${API_URL_BASE}/search/documents?q=${searchTerm}`), // <-- ИЗМЕНЕНИЕ 3
                axios.get(`${API_URL_BASE}/search/knowledge?q=${searchTerm}`) // <-- ИЗМЕНЕНИЕ 4
            ]);

            setSearchResults({
                news: newsRes.data,
                documents: docsRes.data,
                knowledge: knowledgeRes.data
            });
        } catch (err) {
            console.error('Ошибка при поиске:', err);
            setError('Не удалось выполнить поиск. Пожалуйста, попробуйте еще раз.');
        } finally {
            setLoading(false);
        }
    };

    const hasResults =
        searchResults.news.length > 0 ||
        searchResults.documents.length > 0 ||
        searchResults.knowledge.length > 0;

    return (
        <div style={{ padding: '15px', backgroundColor: '#e9ecef', borderRadius: '8px', marginBottom: '20px', maxWidth: '800px', margin: '20px auto' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="Поиск..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flexGrow: '1', padding: '10px', border: '1px solid #ced4da', borderRadius: '5px' }}
                />
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Найти
                </button>
            </form>

            {loading && <p style={{ textAlign: 'center', marginTop: '10px' }}>Поиск...</p>}
            {error && <p style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>{error}</p>}

            {searchTerm.trim() && !loading && !hasResults && (
                <p style={{ textAlign: 'center', marginTop: '10px' }}>
                    По запросу "{searchTerm}" ничего не найдено.
                </p>
            )}

            {hasResults && (
                <div style={{ marginTop: '20px', borderTop: '1px solid #dee2e6', paddingTop: '20px' }}>
                    <h3>Результаты поиска:</h3>

                    {searchResults.news.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h4>Новости ({searchResults.news.length})</h4>
                            {searchResults.news.map((item) => (
                                <div key={item._id} style={{ border: '1px solid #f0f0f0', padding: '10px', marginBottom: '10px', borderRadius: '5px', backgroundColor: 'white' }}>
                                    <strong>{item.title}</strong>
                                    <p style={{ fontSize: '14px', color: '#666', margin: '5px 0' }}>{item.content.substring(0, 150)}...</p>
                                    <button onClick={() => onNavigateToPage('news')} style={resultButtonStyle}>Перейти к Новостям</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {searchResults.documents.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h4>Документы ({searchResults.documents.length})</h4>
                            {searchResults.documents.map((item) => (
                                <div key={item._id} style={{ border: '1px solid #f0f0f0', padding: '10px', marginBottom: '10px', borderRadius: '5px', backgroundColor: 'white' }}>
                                    <strong>{item.title}</strong> {item.category && `(${item.category})`}
                                    <p style={{ fontSize: '14px', color: '#666', margin: '5px 0' }}>{item.description?.substring(0, 150)}...</p>
                                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" style={{ ...resultButtonStyle, backgroundColor: '#007bff' }}>
                                        Скачать ({item.fileUrl.split('.').pop().toUpperCase()})
                                    </a>
                                    <button onClick={() => onNavigateToPage('documents')} style={resultButtonStyle}>Перейти к Документам</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {searchResults.knowledge.length > 0 && (
                        <div>
                            <h4>База знаний ({searchResults.knowledge.length})</h4>
                            {searchResults.knowledge.map((item) => (
                                <div key={item._id} style={{ border: '1px solid #f0f0f0', padding: '10px', marginBottom: '10px', borderRadius: '5px', backgroundColor: 'white' }}>
                                    <strong>{item.title}</strong> {item.category && `(${item.category})`}
                                    <p style={{ fontSize: '14px', color: '#666', margin: '5px 0' }}>{item.content.substring(0, 150)}...</p>
                                    <button onClick={() => onNavigateToPage('knowledge')} style={resultButtonStyle}>Перейти к Базе знаний</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const resultButtonStyle = {
    padding: '6px 10px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    marginTop: '5px',
    marginRight: '10px' // Добавляем отступ
};

export default GlobalSearch;