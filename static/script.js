const chatArea = document.getElementById('chatArea');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const sessionList = document.getElementById('sessionList');
const darkModeToggle = document.getElementById('darkModeToggle');

let currentSession = null;

// Dark mode functionality
function enableDarkMode() {
    document.documentElement.classList.add('dark');
    localStorage.setItem('darkMode', 'enabled');
}

function disableDarkMode() {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', 'disabled');
}

// Check for saved dark mode preference or system preference
if (
    localStorage.getItem('darkMode') === 'enabled' ||
    (localStorage.getItem('darkMode') === null &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
    enableDarkMode();
} else {
    disableDarkMode();
}

// Dark mode toggle
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
                    message.timestamp
                );
            });
        });
}

function appendMessage(content, sender, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-4 ${
        sender === 'user' ? 'text-right' : 'text-left'
    }`;
    const date = new Date(timestamp);
    messageDiv.innerHTML = `
        <div class="inline-block max-w-3/4 ${
            sender === 'user'
                ? 'bg-blue-100 text-gray-900 dark:bg-blue-800 dark:text-white'
                : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
        } rounded-lg p-3">
            <div class="flex justify-between items-center mb-2 min-w-60">
                <span class="font-bold">${
                    sender === 'user' ? 'You' : 'Assistant'
                }</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">${date.toLocaleString()}</span>
            </div>
            <p>${content}</p>
        </div>
    `;
    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
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
                appendMessage(message, 'user', new Date().toISOString());
                appendMessage(data.model_response, 'assistant', data.timestamp);
            });
    }

    userInput.value = '';
}

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

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
                        <a href="#" onclick="selectSession('${
                            session.id
                        }')" class="hover:text-blue-500">
                            ${new Date(session.created_at).toLocaleString()}
                        </a>
                    `;
                    if (session.model !== modelNameTag) {
                        li.classList.add('opacity-50');
                    }
                    sessionUl.appendChild(li);
                });
            });
        });
}

function selectSession(sessionId) {
    currentSession = sessionId;
    loadChatHistory(sessionId);
}

function initializeApp() {
    fetch(`/api/get_latest_session?model=${modelNameTag}`)
        .then((response) => response.json())
        .then((data) => {
            currentSession = data.id;
            updateSessionList();
            loadChatHistory(currentSession);
        });
}

initializeApp();
