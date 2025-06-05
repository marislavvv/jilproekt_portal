import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../App'; // Импортируем базовый URL из App.jsx

function ProjectsPage({ user }) {
    const [currentProjects, setCurrentProjects] = useState([]);
    const [completedProjects, setCompletedProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    // Form states for new project
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [departments, setDepartments] = useState('');
    const [projectImage, setProjectImage] = useState(null);
    const [formMessage, setFormMessage] = useState('');

    const isManagerOrAdmin = user && (user.role === 'manager' || user.role === 'admin');

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        setError('');
        try {
            const currentRes = await axios.get(`${API_URL}/api/projects/current`);
            setCurrentProjects(currentRes.data);

            const completedRes = await axios.get(`${API_URL}/api/projects/completed`);
            setCompletedProjects(completedRes.data);
            setLoading(false);
        } catch (err) {
            console.error('Ошибка при загрузке проектов:', err);
            setError('Не удалось загрузить проекты.');
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        setProjectImage(e.target.files[0]);
    };

    const handleAddProject = async (e) => {
        e.preventDefault();
        setFormMessage('');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('startDate', startDate);
        formData.append('endDate', endDate);
        formData.append('departments', departments);
        if (projectImage) {
            formData.append('projectImage', projectImage);
        }

        try {
            // Добавляем токен авторизации
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/projects`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-auth-token': token // Добавляем токен авторизации
                }
            });
            setFormMessage('Проект успешно добавлен!');
            // Clear form
            setTitle('');
            setDescription('');
            setStartDate('');
            setEndDate('');
            setDepartments('');
            setProjectImage(null);
            setShowAddForm(false);
            fetchProjects(); // Refresh projects list
        } catch (err) {
            console.error('Ошибка при добавлении проекта:', err.response?.data || err);
            setFormMessage(err.response?.data?.msg || 'Ошибка при добавлении проекта.');
        }
    };

    const handleCompleteProject = async (id) => {
        if (window.confirm('Вы уверены, что хотите отметить этот проект как завершенный?')) {
            try {
                const token = localStorage.getItem('token'); // Получаем токен из localStorage
                if (!token) {
                    alert('Для выполнения этого действия требуется авторизация. Пожалуйста, войдите в систему.');
                    return; // Прекращаем выполнение функции, если токена нет
                }

                await axios.put(
                    `${API_URL}/api/projects/${id}/complete`, // URL
                    {}, // Пустой объект как тело запроса (обязательно для PUT, если нет данных)
                    { // Объект конфигурации с заголовками
                        headers: {
                            'x-auth-token': token // Добавляем токен авторизации
                        }
                    }
                );
                alert('Проект отмечен как завершенный!');
                fetchProjects(); // Обновляем списки проектов после успешного завершения
            } catch (err) {
                console.error('Ошибка при завершении проекта:', err.response?.data || err);
                // Улучшенное сообщение об ошибке для пользователя
                let errorMessage = 'Ошибка при завершении проекта.';
                if (err.response) {
                    if (err.response.status === 401) {
                        errorMessage = 'Вы не авторизованы для выполнения этого действия. Пожалуйста, войдите в систему.';
                    } else if (err.response.status === 403) {
                        errorMessage = 'У вас нет прав для выполнения этого действия (только менеджеры и администраторы).';
                    } else if (err.response.data && err.response.data.msg) {
                        errorMessage = err.response.data.msg;
                    }
                }
                alert(errorMessage);
            }
        }
    };

    const handleDeleteProject = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить этот проект? Это действие необратимо.')) {
            try {
                // Добавляем токен авторизации
                const token = localStorage.getItem('token');
                await axios.delete(`${API_URL}/api/projects/${id}`, {
                    headers: {
                        'x-auth-token': token // Добавляем токен авторизации
                    }
                });
                alert('Проект успешно удален!');
                fetchProjects(); // Refresh projects list
            } catch (err) {
                console.error('Ошибка при удалении проекта:', err.response?.data || err);
                alert(err.response?.data?.msg || 'Ошибка при удалении проекта.');
            }
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Загрузка проектов...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>{error}</div>;
    }

    const projectCardStyle = {
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column'
    };

    const imageStyle = {
        maxWidth: '100%',
        height: 'auto',
        borderRadius: '4px',
        marginBottom: '10px'
    };

    const buttonStyle = {
        padding: '8px 12px',
        margin: '5px',
        borderRadius: '5px',
        cursor: 'pointer',
        border: 'none'
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: 'auto' }}>
            <h2>Раздел Проекты</h2>

            {isManagerOrAdmin && (
                <div style={{ marginBottom: '30px' }}>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        style={{ ...buttonStyle, backgroundColor: '#28a745', color: 'white' }}
                    >
                        {showAddForm ? 'Скрыть форму добавления' : 'Добавить новый проект'}
                    </button>

                    {showAddForm && (
                        <form onSubmit={handleAddProject} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginTop: '15px', backgroundColor: '#f9f9f9' }}>
                            <h3>Добавить Проект</h3>
                            {formMessage && <p style={{ color: formMessage.includes('Ошибка') ? 'red' : 'green' }}>{formMessage}</p>}
                            <input
                                type="text"
                                placeholder="Название проекта"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                style={{ width: '98%', padding: '8px', marginBottom: '10px' }}
                                required
                            />
                            <textarea
                                placeholder="Краткое описание"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="3"
                                style={{ width: '98%', padding: '8px', marginBottom: '10px' }}
                                required
                            ></textarea>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Дата начала:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ width: '98%', padding: '8px', marginBottom: '10px' }}
                                required
                            />
                            <label style={{ display: 'block', marginBottom: '5px' }}>Дата завершения (необязательно):</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ width: '98%', padding: '8px', marginBottom: '10px' }}
                            />
                            <input
                                type="text"
                                placeholder="Задействованные отделы (через запятую)"
                                value={departments}
                                onChange={(e) => setDepartments(e.target.value)}
                                style={{ width: '98%', padding: '8px', marginBottom: '10px' }}
                                required
                            />
                            <label style={{ display: 'block', marginBottom: '5px' }}>Фото объекта (необязательно):</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ marginBottom: '15px' }}
                            />
                            <button type="submit" style={{ ...buttonStyle, backgroundColor: '#007bff', color: 'white', width: '100%' }}>
                                Добавить Проект
                            </button>
                        </form>
                    )}
                </div>
            )}

            <h3>Текущие Проекты ({currentProjects.length})</h3>
            {currentProjects.length === 0 ? (
                <p>Нет текущих проектов.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {currentProjects.map((project) => (
                        <div key={project._id} style={projectCardStyle}>
                            <h4>{project.title}</h4>
                            {project.imageUrl && (
                                
                                <img src={project.imageUrl} alt={project.title} style={imageStyle} />
                            )}
                            <p><strong>Описание:</strong> {project.description}</p>
                            <p><strong>Сроки:</strong> {new Date(project.startDate).toLocaleDateString()} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Пока нет'}</p>
                            <p><strong>Отделы:</strong> {project.departments.join(', ')}</p>
                            {isManagerOrAdmin && (
                                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px dashed #eee' }}>
                                    <button
                                        onClick={() => handleCompleteProject(project._id)}
                                        style={{ ...buttonStyle, backgroundColor: '#ffc107', color: 'white' }}
                                    >
                                        Проект завершен
                                    </button>
                                    {(user.role === 'admin') && (
                                        <button
                                            onClick={() => handleDeleteProject(project._id)}
                                            style={{ ...buttonStyle, backgroundColor: '#dc3545', color: 'white' }}
                                        >
                                            Удалить
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <h3 style={{ marginTop: '40px' }}>Завершенные Проекты ({completedProjects.length})</h3>
            {completedProjects.length === 0 ? (
                <p>Нет завершенных проектов.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {completedProjects.map((project) => (
                        <div key={project._id} style={{ ...projectCardStyle, opacity: 0.8, backgroundColor: '#e9ecef' }}>
                            <h4>{project.title} (Завершен)</h4>
                            {project.imageUrl && (
                                
                                <img src={project.imageUrl} alt={project.title} style={imageStyle} />
                            )}
                            <p><strong>Описание:</strong> {project.description}</p>
                            <p><strong>Сроки:</strong> {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</p>
                            <p><strong>Отделы:</strong> {project.departments.join(', ')}</p>
                            {isManagerOrAdmin && user.role === 'admin' && (
                                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px dashed #eee' }}>
                                    <button
                                        onClick={() => handleDeleteProject(project._id)}
                                        style={{ ...buttonStyle, backgroundColor: '#dc3545', color: 'white' }}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ProjectsPage;