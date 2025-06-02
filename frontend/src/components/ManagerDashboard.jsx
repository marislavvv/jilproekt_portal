import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL_BASE } from '../App'; // <-- ИЗМЕНЕНИЕ 1: Импортируем базовый URL из App.jsx

// Удалите или закомментируйте эту строку
// const API_URL = 'http://localhost:5000/api';

function ManagerDashboard({ user }) {
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAllRequests();
    }, []);

    const fetchAllRequests = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL_BASE}/requests/all`); // <-- ИЗМЕНЕНИЕ 2
            setAllRequests(response.data);
            setError(null);
        } catch (err) {
            console.error('Ошибка при загрузке всех заявок:', err);
            setError('Не удалось загрузить заявки. Проверьте ваши права доступа.');
            setAllRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRequestStatus = async (requestId, newStatus) => {
        try {
            await axios.put(`${API_URL_BASE}/requests/${requestId}/status`, { status: newStatus }); // <-- ИЗМЕНЕНИЕ 3
            alert(`Статус заявки ${requestId} обновлен на "${newStatus}"`);
            fetchAllRequests(); // Обновить список заявок
        } catch (err) {
            console.error('Ошибка при обновлении статуса:', err);
            alert('Ошибка при обновлении статуса заявки.');
        }
    };

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка заявок...</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>;
    }

    // Фильтруем заявки, чтобы показать только те, которые относятся к отделу менеджера (опционально)
    // В данном примере показываем все, но можно добавить фильтрацию по user.department
    const requestsForManager = allRequests.filter(request =>
        // Если вы хотите фильтровать по отделу, раскомментируйте и настройте это:
        // user.role === 'admin' || request.details.includes(user.department) // Пример: если отдел упоминается в деталях
        // Или, если заявки имеют поле department: request.department === user.department
        true // Пока без фильтрации по отделу, показываем все заявки
    );


    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto' }}>
            <h2>Панель управления заявками (для {user.name || user.employeeId}, {user.role})</h2>

            {requestsForManager.length === 0 ? (
                <p>Нет активных заявок, требующих рассмотрения.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {requestsForManager.map((req) => (
                        <div key={req._id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <p><strong>Тип:</strong> {req.type}</p>
                            <p><strong>Сотрудник:</strong> {req.employeeName}</p>
                            <p><strong>Статус:</strong> <span style={{ fontWeight: 'bold', color: req.status === 'Одобрена' ? 'green' : req.status === 'Отклонена' ? 'red' : 'orange' }}>{req.status}</span></p>
                            <p><strong>Детали:</strong> {req.details}</p>
                            {req.startDate && req.endDate && (
                                <p><strong>Период:</strong> {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</p>
                            )}
                            <small>Подано: {new Date(req.submissionDate).toLocaleDateString()} {new Date(req.submissionDate).toLocaleTimeString()}</small>
                            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => handleUpdateRequestStatus(req._id, 'Одобрена')}
                                    style={{ padding: '8px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: req.status === 'Одобрена' ? 0.6 : 1 }}
                                    disabled={req.status === 'Одобрена'}
                                >
                                    Одобрить
                                </button>
                                <button
                                    onClick={() => handleUpdateRequestStatus(req._id, 'Отклонена')}
                                    style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: req.status === 'Отклонена' ? 0.6 : 1 }}
                                    disabled={req.status === 'Отклонена'}
                                >
                                    Отклонить
                                </button>
                                <button
                                    onClick={() => handleUpdateRequestStatus(req._id, 'В работе')}
                                    style={{ padding: '8px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: req.status === 'В работе' ? 0.6 : 1 }}
                                    disabled={req.status === 'В работе'}
                                >
                                    В работу
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ManagerDashboard;