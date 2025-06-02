import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { API_URL} from '../App'; 



function DepartmentChat({ user }) {
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [department, setDepartment] = useState(''); // Отдел текущего пользователя
    const [chatStatus, setChatStatus] = useState('Не подключен'); // Статус подключения к чату
    const messagesEndRef = useRef(null); // Для прокрутки чата вниз

    // Получаем токен из localStorage
    const getToken = useCallback(() => {
        return localStorage.getItem('token');
    }, []);

    // Получаем текущий отдел пользователя из бэкенда
    useEffect(() => {
        const fetchUserProfile = async () => {
            const token = getToken();
            if (token) {
                try {
                    const response = await axios.get(`${API_URL}/auth/me`, { // <-- ИЗМЕНЕНИЕ 2
                        headers: { 'x-auth-token': token }
                    });
                    setDepartment(response.data.department);
                } catch (err) {
                    console.error('Ошибка при получении профиля пользователя:', err);
                    setChatStatus('Ошибка: Не удалось получить ваш отдел.');
                }
            } else {
                setChatStatus('Ошибка: Токен не найден. Войдите в систему.');
            }
        };
        fetchUserProfile();
    }, [getToken]);

    // Инициализация Socket.IO при изменении department (когда он загружен)
    useEffect(() => {
        if (!department || !user) return; // Не подключаемся, пока нет отдела и данных пользователя

        // ИСПОЛЬЗУЕМ API_URL_BASE для подключения Socket.IO
        const newSocket = io(API_URL.replace('/api', ''), { // <-- ИЗМЕНЕНИЕ 3: Удаляем "/api" для базового URL сокета
            query: { token: getToken() } // Отправляем токен при подключении
        });

        newSocket.on('connect', () => {
            setChatStatus('Подключен. Попытка присоединиться к чату отдела...');
            // Отправляем событие присоединения к чату отдела
            newSocket.emit('joinDepartmentChat', {
                token: getToken(),
                department: department
            });
        });

        newSocket.on('chatError', (msg) => {
            console.error('Ошибка чата:', msg);
            setChatStatus(`Ошибка чата: ${msg}`);
            newSocket.disconnect(); // Отключаемся при ошибке
        });

        newSocket.on('joinSuccess', (msg) => {
            setChatStatus(msg);
        });

        newSocket.on('chatHistory', (history) => {
            setMessages(history);
            scrollToBottom();
        });

        newSocket.on('receiveMessage', (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
        });

        newSocket.on('disconnect', () => {
            setChatStatus('Отключен.');
            setSocket(null); // Очищаем сокет при отключении
        });

        setSocket(newSocket);

        // Очистка при размонтировании компонента или изменении зависимостей
        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [department, user, getToken]); // Зависимости: отдел, данные пользователя, функция получения токена

    // Прокрутка сообщений вниз
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim() && socket && department) {
            socket.emit('sendMessage', {
                token: getToken(),
                department: department,
                message: newMessage.trim()
            });
            setNewMessage('');
        }
    };

    if (!user) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>Пожалуйста, войдите в систему, чтобы использовать чат.</p>
            </div>
        );
    }

    if (!department) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>Загрузка информации об отделе или отдел не определен...</p>
                <p>Статус: {chatStatus}</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <h2>Чат отдела: {department}</h2>
            <p style={{ fontSize: '0.9em', color: '#666' }}>Статус подключения: {chatStatus}</p>

            <div style={{
                height: '400px',
                border: '1px solid #eee',
                padding: '10px',
                overflowY: 'auto',
                marginBottom: '15px',
                backgroundColor: '#fdfdfd',
                borderRadius: '5px'
            }}>
                {messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#888' }}>Сообщений пока нет. Будьте первым!</p>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} style={{ marginBottom: '8px', borderBottom: '1px dotted #eee', paddingBottom: '5px' }}>
                            <strong style={{ color: msg.senderId === user.employeeId ? '#007bff' : '#28a745' }}>
                                {msg.senderName}:
                            </strong>{' '}
                            {msg.message}
                            <div style={{ fontSize: '0.75em', color: '#999', textAlign: 'right' }}>
                                {new Date(msg.timestamp).toLocaleString()}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} /> {/* Для прокрутки */}
            </div>

            <form onSubmit={handleSendMessage} style={{ display: 'flex' }}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Напишите сообщение..."
                    style={{ flexGrow: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '5px 0 0 5px', outline: 'none' }}
                    disabled={!socket || !department || chatStatus.includes('Ошибка')}
                />
                <button
                    type="submit"
                    style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '0 5px 5px 0', cursor: 'pointer' }}
                    disabled={!socket || !department || chatStatus.includes('Ошибка')}
                >
                    Отправить
                </button>
            </form>
        </div>
    );
}

export default DepartmentChat;