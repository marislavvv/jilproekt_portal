// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NewsFeed from './components/NewsFeed';
import DocumentLibrary from './components/DocumentLibrary';
import KnowledgeBase from './components/KnowledgeBase';
import GlobalSearch from './components/GlobalSearch';
import ProjectsPage from './components/ProjectsPage';
import DepartmentChat from './components/DepartmentChat'; // <-- ИМПОРТИРУЕМ КОМПОНЕНТ ЧАТА

// It seems UserProfileComponent and RequestsDashboard are defined in this same file.
// If they were separate files, you would import them like:
// import UserProfileComponent from './components/UserProfileComponent';
// import RequestsDashboard from './components/RequestsDashboard';

export const API_URL_BASE = "https://jilproekt-portal.onrender.com";
// import.meta.env.VITE_API_URL + '/api';

// --- Компонент Входа/Регистрации ---
function AuthComponent({ onLoginSuccess }) {
    const [isRegister, setIsRegister] = useState(false);
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [position, setPosition] = useState('');
    const [department, setDepartment] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            let response;
            if (isRegister) {
                response = await axios.post(`${API_URL}/auth/register`, { employeeId, password, name, position, department });
            } else {
                response = await axios.post(`${API_URL}/auth/login`, { employeeId, password });
            }
            localStorage.setItem('token', response.data.token);
            onLoginSuccess(response.data.user || { employeeId, name: name || employeeId, role: response.data.user?.role || 'employee' });
            setMessage(response.data.message);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Произошла ошибка');
            console.error('Ошибка аутентификации:', error.response?.data || error);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <h2>{isRegister ? 'Регистрация' : 'Вход'}</h2>
            <form onSubmit={handleSubmit}>
                {message && <p style={{ color: message.includes('Ошибка') ? 'red' : 'green' }}>{message}</p>}
                <input
                    type="text"
                    placeholder="ID Сотрудника (например, EMP001)"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    style={{ width: '90%', padding: '8px', marginBottom: '10px' }}
                    required
                />
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '90%', padding: '8px', marginBottom: '10px' }}
                    required
                />
                {isRegister && (
                    <>
                        <input type="text" placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '90%', padding: '8px', marginBottom: '10px' }} required />
                        <input type="text" placeholder="Должность" value={position} onChange={(e) => setPosition(e.target.value)} style={{ width: '90%', padding: '8px', marginBottom: '10px' }} />
                        <input type="text" placeholder="Отдел" value={department} onChange={(e) => setDepartment(e.target.value)} style={{ width: '90%', padding: '8px', marginBottom: '10px' }} />
                    </>
                )}
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '96%' }}>
                    {isRegister ? 'Зарегистрироваться' : 'Войти'}
                </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '15px' }}>
                {isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}
                <button onClick={() => setIsRegister(!isRegister)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', marginLeft: '5px' }}>
                    {isRegister ? 'Войти' : 'Зарегистрироваться'}
                </button>
            </p>
        </div>
    );
}

// --- Основной компонент App ---
function App() {
    const [currentPage, setCurrentPage] = useState('news');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers['x-auth-token'] = token;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        const token = localStorage.getItem('token');
        if (token) {
            axios.get(`${API_URL}/auth/me`)
                .then(res => {
                    setUser(res.data);
                    setLoading(false);
                })
                .catch((error) => {
                    console.error('Ошибка валидации токена:', error);
                    localStorage.removeItem('token');
                    setUser(null);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const handleLoginSuccess = (userData) => {
        setUser(userData);
        setCurrentPage('news');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setCurrentPage('news');
    };

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Загрузка...</div>;
    }

    if (!user) {
        return <AuthComponent onLoginSuccess={handleLoginSuccess} />;
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'news':
                return <NewsFeed user={user} />;
            case 'documents':
                return <DocumentLibrary user={user} />;
            case 'requests':
                return <OnlineRequests user={user} />;
            case 'knowledge':
                return <KnowledgeBase user={user} />;
            case 'profile':
                return <UserProfileComponent user={user} />;
            case 'requests-dashboard':
                return <RequestsDashboard user={user} />;
            case 'projects':
                return <ProjectsPage user={user} />;
            case 'chat': // <-- НОВЫЙ КЕЙС ДЛЯ ЧАТА
                return <DepartmentChat user={user} />;
            default:
                return <NewsFeed user={user} />;
        }
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
            <header style={{ backgroundColor: '#333', color: 'white', padding: '15px 20px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h1>БрестЖилПроект-Инфо</h1>
                {user && (
                    <nav style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => setCurrentPage('news')} style={navButtonStyle}>Новости</button>
                        <button onClick={() => setCurrentPage('documents')} style={navButtonStyle}>Документы</button>
                        <button onClick={() => setCurrentPage('requests')} style={navButtonStyle}>Заявки</button>
                        <button onClick={() => setCurrentPage('knowledge')} style={navButtonStyle}>База знаний</button>
                        <button onClick={() => setCurrentPage('projects')} style={navButtonStyle}>Проекты</button>
                        <button onClick={() => setCurrentPage('chat')} style={navButtonStyle}>Чат отдела</button> {/* <-- НОВАЯ КНОПКА ДЛЯ ЧАТА */}
                        {(user.role === 'manager' || user.role === 'admin') && (
                            <button onClick={() => setCurrentPage('requests-dashboard')} style={navButtonStyle}>Управление заявками</button>
                        )}
                        <button onClick={() => setCurrentPage('profile')} style={navButtonStyle}>Личный кабинет</button>
                        <span style={{ marginLeft: '20px', fontSize: '14px', whiteSpace: 'nowrap' }}>Привет, {user.name || user.employeeId}!</span>
                        <button onClick={handleLogout} style={{ ...navButtonStyle, marginLeft: '15px', backgroundColor: '#dc3545' }}>Выход</button>
                    </nav>
                )}
            </header>
            <main>
                {user && <GlobalSearch onNavigateToPage={setCurrentPage} user={user} />}
                {renderPage()}
            </main>
        </div>
    );
}

const navButtonStyle = {
    background: 'none',
    border: 'none',
    color: 'white',
    padding: '10px 15px',
    margin: '0 5px',
    cursor: 'pointer',
    fontSize: '16px',
    borderRadius: '5px',
    transition: 'background-color 0.3s ease',
    whiteSpace: 'nowrap'
};

// --- OnlineRequests ---
function OnlineRequests({ user }) {
    const [type, setType] = useState('Отпуск');
    const [details, setDetails] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [myRequests, setMyRequests] = useState([]);

    const currentEmployeeName = user.name || user.employeeId;

    useEffect(() => {
        if (user.employeeId) {
            fetchMyRequests();
        }
    }, [user.employeeId]);

    const fetchMyRequests = async () => {
        try {
            const response = await axios.get(`${API_URL}/requests/me`);
            setMyRequests(response.data);
        } catch (error) {
            console.error('Ошибка при загрузке моих заявок:', error);
        }
    };

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        const requestData = { type, employeeName: currentEmployeeName, employeeId: user.employeeId, details };
        if (type === 'Отпуск' || type === 'Командировка') {
            requestData.startDate = startDate;
            requestData.endDate = endDate;
        }
        try {
            await axios.post(`${API_URL}/requests`, requestData);
            alert('Заявка успешно отправлена!');
            setType('Отпуск');
            setDetails('');
            setStartDate('');
            setEndDate('');
            fetchMyRequests();
        } catch (error) {
            console.error('Ошибка при отправке заявки:', error);
            alert('Ошибка при отправке заявки.');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
            <h2>Онлайн-заявки</h2>
            <form onSubmit={handleSubmitRequest} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
                <h3>Создать новую заявку</h3>
                <label style={{ display: 'block', marginBottom: '10px' }}>
                    Тип заявки:
                    <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
                        <option value="Отпуск">Отпуск</option>
                        <option value="Командировка">Командировка</option>
                        <option value="Техподдержка">Техподдержка</option>
                        <option value="Болезнь/Больничный">Болезнь/больничный</option>
                        <option value="Другое">Другое</option>
                    </select>
                </label>
                <p>Вы подаете заявку как: <strong>{currentEmployeeName}</strong></p>
                { (type === 'Отпуск' || type === 'Командировка') && (
                    <>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '98%', padding: '8px', marginBottom: '10px' }} required />
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '98%', padding: '8px', marginBottom: '10px' }} required />
                    </>
                )}
                <textarea placeholder="Детали заявки" value={details} onChange={(e) => setDetails(e.target.value)} rows="4" style={{ width: '98%', padding: '8px', marginBottom: '10px' }} required></textarea>
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#ffc107', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Отправить заявку</button>
            </form>

            <h3>Мои заявки ({currentEmployeeName})</h3>
            <div>
                {myRequests.length === 0 ? (
                    <p>У вас пока нет заявок.</p>
                ) : (
                    myRequests.map((req) => (
                        <div key={req._id} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                            <p><strong>Тип:</strong> {req.type}</p>
                            <p><strong>Статус:</strong> {req.status}</p>
                            <p><strong>Детали:</strong> {req.details}</p>
                            <small>Подано: {new Date(req.submissionDate).toLocaleDateString()}</small>
                            {(req.startDate && req.endDate) && (
                                <small style={{ display: 'block' }}>Период: {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</small>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// --- UserProfileComponent ---
function UserProfileComponent({ user }) {
    const [profile, setProfile] = useState(null);
    const [myRequests, setMyRequests] = useState([]);
    const [allSystemRequests, setAllSystemRequests] = useState([]);
    const [loadingAllRequests, setLoadingAllRequests] = useState(false);
    const [allRequestsError, setAllRequestsError] = useState('');

    const currentEmployeeId = user.employeeId;
    const currentEmployeeName = user.name || user.employeeId;

    const isManagerOrAdmin = user && (user.role === 'manager' || user.role === 'admin');

    useEffect(() => {
        if (currentEmployeeId) {
            fetchProfile();
            fetchMyRequests();

            if (isManagerOrAdmin) {
                fetchAllSystemRequests();
            }
        }
    }, [currentEmployeeId, isManagerOrAdmin]);

    const fetchProfile = async () => {
        try {
            const response = await axios.get(`${API_URL}/profile/me`);
            setProfile(response.data);
        } catch (error) {
            console.error('Ошибка при загрузке профиля:', error);
            setProfile(null);
        }
    };

    const fetchMyRequests = async () => {
        try {
            const response = await axios.get(`${API_URL}/requests/me`);
            setMyRequests(response.data);
        } catch (error) {
            console.error('Ошибка при загрузке моих заявок в профиле:', error);
            setMyRequests([]);
        }
    };

    const fetchAllSystemRequests = async () => {
        setLoadingAllRequests(true);
        setAllRequestsError('');
        try {
            const response = await axios.get(`${API_URL}/requests/all`);
            setAllSystemRequests(response.data);
            setLoadingAllRequests(false);
        } catch (error) {
            console.error('Ошибка при загрузке всех заявок для менеджера/админа:', error);
            setAllSystemRequests([]);
            setAllRequestsError('Не удалось загрузить все заявки. Возможно, у вас нет прав.');
            setLoadingAllRequests(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto' }}>
            <h2>Личный кабинет</h2>

            {profile ? (
                <div style={{ border: '1px solid #eee', padding: '15px', marginBottom: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <h3>Ваш профиль</h3>
                    <p><strong>ID:</strong> {profile.employeeId}</p>
                    <p><strong>Имя:</strong> {profile.name}</p>
                    <p><strong>Должность:</strong> {profile.position}</p>
                    <p><strong>Отдел:</strong> {profile.department}</p>
                    <p><strong>Роль:</strong> {profile.role}</p>
                </div>
            ) : (
                <p style={{ textAlign: 'center', color: 'red' }}>Профиль не найден. Попробуйте перезайти или зарегистрироваться.</p>
            )}

            <h3>Мои заявки</h3>
            <div style={{ marginBottom: '30px' }}>
                {myRequests.length === 0 ? (
                    <p>Вы пока не подавали заявки.</p>
                ) : (
                    myRequests.map((req) => (
                        <div key={req._id} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                            <p><strong>Тип:</strong> {req.type}</p>
                            <p><strong>Статус:</strong> {req.status}</p>
                            <p><strong>Детали:</strong> {req.details}</p>
                            <small>Подано: {new Date(req.submissionDate).toLocaleDateString()}</small>
                            {(req.startDate && req.endDate) && (
                                <small style={{ display: 'block' }}>Период: {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</small>
                            )}
                            {req.assignedTo && <small style={{ display: 'block' }}>Назначено: {req.assignedTo}</small>}
                        </div>
                    ))
                )}
            </div>

            {isManagerOrAdmin && (
                <div style={{ marginBottom: '30px' }}>
                    <h3>Все заявки в системе (для {user.role === 'admin' ? 'администратора' : 'менеджера'})</h3>
                    {loadingAllRequests ? (
                        <p>Загрузка всех заявок...</p>
                    ) : allRequestsError ? (
                        <p style={{ color: 'red' }}>{allRequestsError}</p>
                    ) : allSystemRequests.length === 0 ? (
                        <p>Активных заявок в системе нет.</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {allSystemRequests.map((req) => (
                                <div key={req._id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                    <p><strong>Тип:</strong> {req.type}</p>
                                    <p><strong>Сотрудник:</strong> {req.employeeName} ({req.employeeId})</p>
                                    <p><strong>Статус:</strong> {req.status}</p>
                                    <p><strong>Детали:</strong> {req.details}</p>
                                    <small>Подано: {new Date(req.submissionDate).toLocaleDateString()}</small>
                                    {(req.startDate && req.endDate) && (
                                        <small style={{ display: 'block' }}>Период: {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</small>
                                    )}
                                    {req.assignedTo && <small style={{ display: 'block' }}>Назначено: {req.assignedTo}</small>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;

// Новый компонент для панели управления заявками (доступен менеджерам/админам)
function RequestsDashboard({ user }) {
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedStatus, setSelectedStatus] = useState({});
    const [assignedTo, setAssignedTo] = useState({});

    const isManagerOrAdmin = user && (user.role === 'manager' || user.role === 'admin');

    useEffect(() => {
        if (isManagerOrAdmin) {
            fetchAllRequests();
        } else {
            setError('У вас нет прав для просмотра этой страницы.');
            setLoading(false);
        }
    }, [isManagerOrAdmin, user]);

    const fetchAllRequests = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(`${API_URL}/requests/all`);
            setAllRequests(response.data);
            const initialStatuses = {};
            const initialAssignedTo = {};
            response.data.forEach(req => {
                initialStatuses[req._id] = req.status;
                initialAssignedTo[req._id] = req.assignedTo || '';
            });
            setSelectedStatus(initialStatuses);
            setAssignedTo(initialAssignedTo);
            setLoading(false);
        } catch (err) {
            console.error('Ошибка при загрузке всех заявок:', err);
            setError('Не удалось загрузить все заявки. Возможно, у вас нет необходимых прав.');
            setLoading(false);
        }
    };

    const handleStatusChange = async (requestId, newStatus) => {
        try {
            await axios.put(`${API_URL}/requests/${requestId}/status`, { status: newStatus });
            setSelectedStatus(prev => ({ ...prev, [requestId]: newStatus }));
            alert('Статус заявки обновлен!');
        } catch (err) {
            console.error('Ошибка при обновлении статуса:', err);
            alert('Ошибка при обновлении статуса заявки.');
        }
    };

    const handleAssignedToChange = async (requestId, newAssignedTo) => {
        try {
            await axios.put(`${API_URL}/requests/${requestId}/status`, { assignedTo: newAssignedTo });
            setAssignedTo(prev => ({ ...prev, [requestId]: newAssignedTo }));
            alert('Исполнитель заявки обновлен!');
        } catch (err) {
            console.error('Ошибка при обновлении исполнителя:', err);
            alert('Ошибка при обновлении исполнителя заявки.');
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Загрузка заявок...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>{error}</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto' }}>
            <h2>Панель управления заявками</h2>
            {!isManagerOrAdmin && <p style={{ textAlign: 'center', color: 'red' }}>У вас нет прав для просмотра этой страницы.</p>}

            {isManagerOrAdmin && allRequests.length === 0 ? (
                <p>Активных заявок нет.</p>
            ) : (
                isManagerOrAdmin && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {allRequests.map((req) => (
                            <div key={req._id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                <p><strong>Тип:</strong> {req.type}</p>
                                <p><strong>Сотрудник:</strong> {req.employeeName} ({req.employeeId})</p>
                                <p><strong>Детали:</strong> {req.details}</p>
                                <p><strong>Подано:</strong> {new Date(req.submissionDate).toLocaleDateString()}</p>
                                {(req.startDate && req.endDate) && (
                                    <p><strong>Период:</strong> {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</p>
                                )}
                                <p>
                                    <strong>Статус:</strong>
                                    <select
                                        value={selectedStatus[req._id]}
                                        onChange={(e) => handleStatusChange(req._id, e.target.value)}
                                        style={{ marginLeft: '10px', padding: '5px' }}
                                    >
                                        <option value="Ожидает">Ожидает</option>
                                        <option value="В работе">В работе</option>
                                        <option value="Одобрена">Одобрена</option>
                                        <option value="Отклонена">Отклонена</option>
                                    </select>
                                </p>
                                <p>
                                    <strong>Назначено:</strong>
                                    <input
                                        type="text"
                                        value={assignedTo[req._id]}
                                        onChange={(e) => setAssignedTo(prev => ({ ...prev, [req._id]: e.target.value }))}
                                        onBlur={(e) => handleAssignedToChange(req._id, e.target.value)}
                                        placeholder="Назначить сотрудника"
                                        style={{ marginLeft: '10px', padding: '5px', width: 'calc(100% - 110px)' }}
                                    />
                                </p>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}