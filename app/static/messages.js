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

function appendMessage(content, sender, timestamp, animate, messageIndex) {
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
            <p class="text-left ml-1" style="white-space: pre-wrap;">${content}</p>
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

    if (isWaitingForResponse) {
        return; // Prevent further messages while waiting for a response
    }

    if (message && currentSession) {
        // Set the lock
        isWaitingForResponse = true;
        userInput.disabled = true;

        // Append a placeholder for the user's message
        const userPlaceholderDiv = document.createElement('div');
        userPlaceholderDiv.className = 'mb-4 text-right fade-in';
        userPlaceholderDiv.innerHTML = `
            <div class="inline-block max-w-3/4 bg-blue-100 text-gray-900 dark:bg-blue-800 dark:text-white rounded-lg p-2">
                <div class="flex justify-between items-center mb-2 min-w-60">
                    <span class="font-bold">You</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${new Date().toLocaleString()}</span>
                </div>
                <p class="text-left ml-1" style="white-space: pre-wrap;">${message}</p>
            </div>
        `;
        chatArea.appendChild(userPlaceholderDiv);

        // Append a loading indicator for the assistant's response
        const assistantPlaceholderDiv = document.createElement('div');
        assistantPlaceholderDiv.className = 'mb-4 text-left fade-in';
        assistantPlaceholderDiv.innerHTML = `
            <div class="inline-block max-w-3/4 bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white rounded-lg p-2">
                <div class="flex justify-between items-center mb-2 min-w-60">
                    <span class="font-bold">Assistant</span>
                </div>
                <div class="text-left ml-1">
                    <div class="loader"></div> <!-- Loading spinner -->
                </div>
            </div>
        `;
        chatArea.appendChild(assistantPlaceholderDiv);
        chatArea.scrollTop = chatArea.scrollHeight;

        // Clear input field
        userInput.value = '';

        // Send the message to the backend
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
                    // mark assistant placeholder as error
                    assistantPlaceholderDiv.innerHTML = `
                        <div class="inline-block max-w-3/4 bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-300 rounded-lg p-2">
                            <div class="flex justify-between items-center mb-2 min-w-60">
                                <span class="font-bold">Assistant</span>
                            </div>
                            <p class="text-left ml-1">Failed to load assistant's response. Please try again.</p>
                        </div>
                    `;
                    return;
                }

                // Replace the placeholders with the actual messages
                chatArea.removeChild(userPlaceholderDiv);
                chatArea.removeChild(assistantPlaceholderDiv);

                appendMessage(
                    message,
                    'user',
                    new Date().toISOString(),
                    false,
                    data.user_msg_id
                );

                appendMessage(
                    data.model_response,
                    'assistant',
                    data.timestamp,
                    true,
                    data.model_msg_id
                );

                // Release the lock
                isWaitingForResponse = false;
                userInput.disabled = false;
            })
            .catch((error) => {
                console.error('Error sending message:', error);
                // Handle error for assistant placeholder
                assistantPlaceholderDiv.innerHTML = `
                    <div class="inline-block max-w-3/4 bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-300 rounded-lg p-2">
                        <div class="flex justify-between items-center mb-2 min-w-60">
                            <span class="font-bold">Assistant</span>
                        </div>
                        <p class="text-left ml-1">Failed to load assistant's response. Please try again.</p>
                    </div>
                `;

                // Release the lock
                isWaitingForResponse = false;
                userInput.disabled = false;
            });
    }
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
