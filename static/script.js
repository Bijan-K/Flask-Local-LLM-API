const chatArea = document.getElementById('chatArea');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const modelList = document.getElementById('modelList');
const darkModeToggle = document.getElementById('darkModeToggle');

const currentModel = 'default_model'; // You can change this to your default model name

// Check for saved dark mode preference or system preference
if (
    localStorage.getItem('darkMode') === 'enabled' ||
    (localStorage.getItem('darkMode') === null &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('darkMode', 'enabled');
} else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', 'disabled');
}

// Dark mode toggle
darkModeToggle.addEventListener('click', () => {
    if (document.documentElement.classList.contains('dark')) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
});

function loadChatHistory() {
    fetch(`/api/get_chat_history?model=${currentModel}`)
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
                    sender === 'user' ? 'You' : currentModel
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
    if (message) {
        fetch('/api/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                model: currentModel,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                appendMessage(message, 'user', new Date().toISOString());
                appendMessage(data.model_response, 'model', data.timestamp);
            });
    }

    loadChatHistory();
    userInput.value = '';
}

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function updateModelList() {
    const models = [currentModel]; // You can make this dynamic if needed
    modelList.innerHTML = '';
    models.forEach((model) => {
        const modelDiv = document.createElement('div');
        modelDiv.className = 'mb-2';
        modelDiv.innerHTML = `
            <h3 class="font-bold text-gray-900 dark:text-white">${model}</h3>
            <ul id="${model}-history" class="list-disc pl-4 text-gray-800 dark:text-gray-300"></ul>
        `;
        modelList.appendChild(modelDiv);
    });
}

updateModelList();
loadChatHistory();
