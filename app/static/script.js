const chatArea = document.getElementById('chatArea');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const sessionList = document.getElementById('sessionList');
const darkModeToggle = document.getElementById('darkModeToggle');

let currentSession = null;

// Dark mode functionality (unchanged)
function enableDarkMode() {
    document.documentElement.classList.add('dark');
    localStorage.setItem('darkMode', 'enabled');
}

function disableDarkMode() {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', 'disabled');
}

if (
    localStorage.getItem('darkMode') === 'enabled' ||
    (localStorage.getItem('darkMode') === null &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
    enableDarkMode();
} else {
    disableDarkMode();
}

darkModeToggle.addEventListener('click', () => {
    if (document.documentElement.classList.contains('dark')) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
});

function loadChatHistory(sessionId) {
    fetch(`/api/get_chat_history?session_id=${sessionId}`)
        .then((response) => response.json())
        .then((messages) => {
            chatArea.innerHTML = '';
            messages.forEach((message) => {
                appendMessage(
                    message.content,
                    message.sender,
                    message.timestamp,
                    false,
                    message.id
                );
            });
        });
}

function appendMessage(
    content,
    sender,
    timestamp,
    animate = true,
    messageIndex
) {
    console.log(content);
    console.log(sender);
    console.log(messageIndex);

    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-4 ${
        sender === 'user' ? 'text-right' : 'text-left'
    } ${animate ? 'fade-in' : ''}`;
    messageDiv.dataset.messageIndex = messageIndex;
    const date = new Date(timestamp);

    let userActions = '';
    if (sender === 'user') {
        userActions = `
            <div class="relative inline-block">
                <button onclick="toggleOptionsMenu(${messageIndex})" class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 focus:outline-none p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M16 12a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2m-6 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2m-6 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2"/></svg>
                </button>
                <div id="options-menu-${messageIndex}" class="absolute right-0 hidden mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-10">
                    <ul class="text-sm mt-2 text-gray-700 dark:text-gray-300">
                        <li>
                            <button onclick="editMessage(${messageIndex})" class="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M4 21q-.425 0-.712-.288T3 20v-2.425q0-.4.15-.763t.425-.637L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.437.65T21 6.4q0 .4-.138.763t-.437.662l-12.6 12.6q-.275.275-.638.425t-.762.15zM17.6 7.8L19 6.4L17.6 5l-1.4 1.4z"/></svg>
                                <span class="ml-2">Edit</span>
                            </button>
                        </li>
                        <li>
                            <button onclick="deleteMessage(${messageIndex})" class="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21V6H4V4h5V3h6v1h5v2h-1v15zm2-2h10V6H7zm2-2h2V8H9zm4 0h2V8h-2zM7 6v13z"/></svg>
                                <span class="ml-2">Delete</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="inline-block max-w-3/4 ${
            sender === 'user'
                ? 'bg-blue-100 text-gray-900 dark:bg-blue-800 dark:text-white'
                : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
        } rounded-lg p-2">
            <div class="flex justify-between items-center mb-2 min-w-60">
                <span class="font-bold">${
                    sender === 'user' ? 'You' : 'Assistant'
                }</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">${date.toLocaleString()}</span>
            </div>
            <p style="white-space: pre-wrap;">${content}</p>
            ${userActions}
        </div>
    `;
    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function toggleOptionsMenu(messageIndex) {
    const menu = document.getElementById(`options-menu-${messageIndex}`);
    const isHidden = menu.classList.contains('hidden');
    // Close all other options menus first
    document
        .querySelectorAll('.options-menu')
        .forEach((el) => el.classList.add('hidden'));
    // Toggle the current menu
    if (isHidden) {
        menu.classList.remove('hidden');
    } else {
        menu.classList.add('hidden');
    }
}

function sendMessage() {
    const message = userInput.value.trim();
    if (message && currentSession) {
        fetch('/api/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                session_id: currentSession,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    console.error(data.error);
                    return;
                }
                appendMessage(
                    message,
                    'user',
                    new Date().toISOString(),
                    true,
                    data.user_msg_id
                );
                appendMessage(
                    data.model_response,
                    'assistant',
                    data.timestamp,
                    true,
                    data.model_msg_id
                );
            });
    }

    userInput.value = '';
}

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function editMessage(messageIndex) {
    const messageDiv = document.querySelector(
        `[data-message-index="${messageIndex}"]`
    );
    const messageContent = messageDiv.querySelector('p').textContent;

    const editInput = document.createElement('textarea');
    editInput.value = messageContent;
    editInput.className = 'w-full p-2 border rounded';

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.className =
        'mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600';

    saveButton.onclick = () => saveEditedMessage(messageIndex, editInput.value);

    messageDiv.innerHTML = '';
    messageDiv.appendChild(editInput);
    messageDiv.appendChild(saveButton);
}

function saveEditedMessage(messageIndex, newContent) {
    fetch('/api/edit_message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: currentSession,
            message_id: messageIndex,
            new_content: newContent,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                console.error(data.error);
                return;
            }
            loadChatHistory(currentSession);
        });
}

function deleteMessage(messageIndex) {
    if (
        confirm(
            'Are you sure you want to delete this message and all subsequent messages?'
        )
    ) {
        fetch('/api/delete_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: currentSession,
                message_id: messageIndex,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    console.error(data.error);
                    return;
                }
                loadChatHistory(currentSession);
            });
    }
}

function createChatSession() {
    fetch('/api/create_chat_session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelNameTag,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                console.error(data.error);
                return;
            }
            currentSession = data.id;
            updateSessionList();
            loadChatHistory(currentSession);
        });
}

function updateSessionList() {
    fetch('/api/get_all_sessions')
        .then((response) => response.json())
        .then((sessions) => {
            sessionList.innerHTML = '';
            const models = new Set(sessions.map((session) => session.model));

            models.forEach((model) => {
                const modelDiv = document.createElement('div');
                modelDiv.className = 'mb-4';
                modelDiv.innerHTML = `
                    <h3 class="font-bold text-gray-900 dark:text-white flex justify-between items-center">
                        ${model}
                        ${
                            model === modelNameTag
                                ? `<button onclick="createChatSession()" class="text-blue-500 hover:text-blue-700">+</button>`
                                : ''
                        }
                    </h3>
                    <ul id="${model}-sessions" class="list-disc pl-4 text-gray-800 dark:text-gray-300"></ul>
                `;
                sessionList.appendChild(modelDiv);

                const modelSessions = sessions.filter(
                    (session) => session.model === model
                );
                const sessionUl = document.getElementById(`${model}-sessions`);

                modelSessions.forEach((session) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div class="flex justify-between items-center">
                            <a href="#" onclick="selectSession('${
                                session.id
                            }', '${
                        session.model
                    }')" class="hover:text-blue-500 ${
                        session.model !== modelNameTag ? 'opacity-50' : ''
                    }">
                                <span class="session-name" data-session-id="${
                                    session.id
                                }">${
                        session.name ||
                        new Date(session.created_at).toLocaleString()
                    }</span>
                            </a>
                            <div>
                                <button onclick="editSessionName('${
                                    session.id
                                }')" class="text-sm text-blue-500 hover:text-blue-700 mr-2">Edit</button>
                                <button onclick="deleteSession('${
                                    session.id
                                }')" class="text-sm text-red-500 hover:text-red-700">Delete</button>
                            </div>
                        </div>
                    `;
                    sessionUl.appendChild(li);
                });
            });
        });
}

function selectSession(sessionId, model) {
    currentSession = sessionId;
    loadChatHistory(sessionId);
    updateSendButtonState(model);
}

function updateSendButtonState(model) {
    if (model === modelNameTag) {
        sendButton.disabled = false;
        sendButton.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        sendButton.disabled = true;
        sendButton.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

function editSessionName(sessionId) {
    const nameSpan = document.querySelector(
        `.session-name[data-session-id="${sessionId}"]`
    );
    const currentName = nameSpan.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'border rounded px-2 py-1 text-sm';

    input.onblur = () => saveSessionName(sessionId, input.value);
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
    };

    nameSpan.innerHTML = '';
    nameSpan.appendChild(input);
    input.focus();
}

function saveSessionName(sessionId, newName) {
    fetch('/api/edit_session_name', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            new_name: newName,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                console.error(data.error);
                return;
            }
            updateSessionList();
        });
}

function deleteSession(sessionId) {
    if (
        confirm(
            'Are you sure you want to delete this session and all its messages?'
        )
    ) {
        fetch('/api/delete_session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: sessionId,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    console.error(data.error);
                    return;
                }
                if (currentSession === sessionId) {
                    currentSession = null;
                    chatArea.innerHTML = '';
                }
                updateSessionList();
            });
    }
}

function initializeApp() {
    fetch(`/api/get_latest_session?model=${modelNameTag}`)
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                console.error(data.error);
                return;
            }
            currentSession = data.id;
            updateSessionList();
            loadChatHistory(currentSession);
            updateSendButtonState(modelNameTag);
        });
}

initializeApp();
