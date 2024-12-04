/**
 * DOM element references
 */
const chatArea = document.getElementById('chatArea');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const sessionList = document.getElementById('sessionList');
const darkModeToggle = document.getElementById('darkModeToggle');

/**
 * Global state variables
 */
let currentSession = null;
let isWaitingForResponse = false;
let modelNameTag = null;

/**
 * Fetches and initializes the model name from server configuration
 * Triggers app initialization after successful fetch
 */
function initializeModelName() {
    fetch('/api/get_model_config')
        .then((response) => response.json())
        .then((data) => {
            modelNameTag = data.model_name;
            initializeApp();
        })
        .catch((error) => {
            console.error('Error fetching model name:', error);
        });
}

/**
 * Enables dark mode by adding appropriate classes
 */
function enableDarkMode() {
    document.documentElement.classList.add('dark');
    document.getElementById('chatArea').classList.add('dark');
    localStorage.setItem('darkMode', 'enabled');
}

/**
 * Disables dark mode by removing appropriate classes
 */
function disableDarkMode() {
    document.documentElement.classList.remove('dark');
    document.getElementById('chatArea').classList.remove('dark');
    localStorage.setItem('darkMode', 'disabled');
}

// Initialize dark mode based on saved preference or system preference
if (
    localStorage.getItem('darkMode') === 'enabled' ||
    (localStorage.getItem('darkMode') === null &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
    enableDarkMode();
} else {
    disableDarkMode();
}

// Add dark mode toggle event listener
darkModeToggle.addEventListener('click', () => {
    if (document.documentElement.classList.contains('dark')) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
});

// Start initialization by getting model name first
initializeModelName();
