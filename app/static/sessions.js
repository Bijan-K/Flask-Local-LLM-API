/**
 * Creates a new chat session with the current model
 * Verifies model name exists before creating session
 * Updates UI and loads chat history after successful creation
 */
function createChatSession() {
    if (!modelNameTag) {
        alert('No model name set. Please add a model first.');
        return;
    }
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

/**
 * Creates a new chat session using the current model
 * Does not modify any model configuration
 * Updates UI after successful creation
 */
function addNewSession() {
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

/**
 * Creates and initializes the model configuration overlay
 * Can be used for both new model creation and system prompt updates
 * @param {string} mode - 'new' for new model, 'edit' for system prompt only
 */
function createModelConfigOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'modelConfigOverlay';
    overlay.className =
        'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center hidden';

    const overlayContent = document.createElement('div');
    overlayContent.className =
        'bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96';

    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);

    window.toggleModelConfigOverlay = (mode = 'new') => {
        const overlay = document.getElementById('modelConfigOverlay');
        const overlayContent = overlay.firstElementChild;

        if (overlay.classList.contains('hidden')) {
            const isNewModel = mode === 'new';
            overlayContent.innerHTML = `
                <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    ${isNewModel ? 'Add New Model' : 'Update System Prompt'}
                </h2>
                
                ${
                    isNewModel
                        ? `
                <div class="mb-4">
                    <label class="block text-gray-700 dark:text-gray-300 mb-2" for="modelNameInput">
                        Model Name
                    </label>
                    <input 
                        type="text" 
                        id="modelNameInput" 
                        class="w-full p-2 border rounded bg-white text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        placeholder="Enter new model name"
                    >
                </div>
                `
                        : ''
                }
                
                <div class="mb-4">
                    <label class="block text-gray-700 dark:text-gray-300 mb-2" for="systemPromptInput">
                        System Prompt
                    </label>
                    <textarea 
                        id="systemPromptInput" 
                        class="w-full p-2 border rounded bg-white text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600 h-32 resize-none"
                        placeholder="Enter system prompt"
                    ></textarea>
                </div>
                
                <div class="flex justify-end space-x-2">
                    <button 
                        id="closeModelConfigBtn" 
                        class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                    <button 
                        id="saveModelConfigBtn" 
                        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        ${isNewModel ? 'Add Model' : 'Update Prompt'}
                    </button>
                </div>
            `;

            if (!isNewModel) {
                fetch('/api/get_model_config')
                    .then((response) => response.json())
                    .then((data) => {
                        document.getElementById('systemPromptInput').value =
                            data.system_prompt;
                    });
            }

            document
                .getElementById('closeModelConfigBtn')
                .addEventListener('click', () => toggleModelConfigOverlay());
            document
                .getElementById('saveModelConfigBtn')
                .addEventListener('click', () => saveModelConfig(mode));

            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    };
}

/**
 * Saves model configuration based on mode
 * @param {string} mode - 'new' for new model, 'edit' for system prompt only
 */
function saveModelConfig(mode) {
    const newSystemPrompt = document
        .getElementById('systemPromptInput')
        .value.trim();
    const payload = { system_prompt: newSystemPrompt };

    if (mode === 'new') {
        const newModelName = document
            .getElementById('modelNameInput')
            .value.trim();
        if (!newModelName) {
            alert('Please enter a model name');
            return;
        }
        payload.model_name = newModelName;
    }

    fetch('/api/set_model_config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                if (mode === 'new') {
                    modelNameTag = data.model_name;
                    createChatSession();
                }
                toggleModelConfigOverlay();
                updateSessionList();
            }
        })
        .catch((error) => {
            console.error('Error saving configuration:', error);
            alert(
                `Failed to ${
                    mode === 'new' ? 'create new model' : 'update system prompt'
                }`
            );
        });
}

/**
 * Fetches and displays all chat sessions grouped by model
 * Creates UI elements for each model and its sessions
 * Includes controls for editing and deleting sessions
 */
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
                    <h3 id="${model}-id" class="font-bold text-gray-900 dark:text-white flex justify-between items-center">
                        ${model}

                        <div>
                        <button onclick="toggleModelConfigOverlay('edit')" class="text-blue-500 hover:text-blue-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path fill="currentColor" d="m15 16l-4 4h10v-4zm-2.94-8.81L3 16.25V20h3.75l9.06-9.06zm1.072-1.067l2.539-2.539l3.747 3.748L16.88 9.87z"/>
                            </svg>
                        </button>
                        <button onclick="addNewSession()" class="text-blue-500 hover:text-blue-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z"/>
                            </svg>
                        </button>
                        </div>
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
                            }', '${session.model}')" 
                               class="hover:text-blue-500 ${
                                   session.model !== modelNameTag
                                       ? 'opacity-50'
                                       : ''
                               }">
                                <span class="session-name" data-session-id="${
                                    session.id
                                }">
                                    ${
                                        session.name ||
                                        new Date(
                                            session.created_at
                                        ).toLocaleString()
                                    }
                                </span>
                            </a>
                            <div>
                                <button onclick="editSessionName('${
                                    session.id
                                }')" 
                                        class="text-sm text-blue-500 hover:text-blue-700 mr-2">Edit</button>
                                <button onclick="deleteSession('${
                                    session.id
                                }')" 
                                        class="text-sm text-red-500 hover:text-red-700">Delete</button>
                            </div>
                        </div>
                    `;
                    sessionUl.appendChild(li);
                });
            });
        });
}

/**
 * Selects a chat session and updates UI accordingly
 * @param {string} sessionId - ID of the session to select
 * @param {string} model - Model name associated with the session
 */
function selectSession(sessionId, model) {
    currentSession = sessionId;
    loadChatHistory(sessionId);
    updateSendButtonState(model);
}

/**
 * Updates send button state based on selected model compatibility
 * @param {string} model - Model name to check against current model
 */
function updateSendButtonState(model) {
    if (model === modelNameTag) {
        sendButton.disabled = false;
        sendButton.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        sendButton.disabled = true;
        sendButton.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

/**
 * Enables inline editing of session name
 * @param {string} sessionId - ID of the session to edit
 */
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

/**
 * Saves updated session name to server
 * @param {string} sessionId - ID of the session
 * @param {string} newName - New name for the session
 */
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

/**
 * Deletes a chat session after confirmation
 * @param {string} sessionId - ID of the session to delete
 */
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

/**
 * Initializes the application
 * Sets up event listeners and loads initial session
 */
function initializeApp() {
    if (!modelNameTag) {
        console.error('Model name not initialized');
        return;
    }

    document
        .getElementById('addModelButton')
        .addEventListener('click', () => toggleModelConfigOverlay('new'));

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

// Initialize application components
createModelConfigOverlay();
