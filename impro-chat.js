(function () {
    // Chat modal HTML with a unique ID
    const chatModalHTML = `
        <div id="improChatModal" class="impro-modal">
            <div class="impro-chat-container">
                <div class="impro-chat-header">
                    <h1>Impro Chat</h1>
                </div>
                <div id="improConversation" class="impro-chat-messages"></div>
                <form id="improChatForm" class="impro-chat-input">
                    <input type="text" id="improUserInput" placeholder="Type your message here..." autocomplete="off">
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    `;

    // Chat styles with a unique prefix
    const chatStyles = `
        .impro-modal {
            display: none;
            position: fixed;
            z-index: 9999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.4);
        }
        .impro-chat-container {
            background-color: #fefefe;
            margin: 10% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%;
            max-width: 600px;
            height: 70%;
            display: flex;
            flex-direction: column;
            font-family: Arial, sans-serif;
        }
        .impro-chat-header {
            background-color: #4a90e2;
            color: white;
            padding: 10px;
            text-align: center;
        }
        .impro-chat-header h1 {
            margin: 0;
            font-size: 24px;
        }
        .impro-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background-color: #e6f2ff;
        }
        .impro-message {
            max-width: 70%;
            margin-bottom: 20px;
            padding: 10px;
            border-radius: 10px;
            clear: both;
        }
        .impro-message p {
            margin: 0 0 10px 0;
        }
        .impro-message p:last-child {
            margin-bottom: 0;
        }
        .impro-message a {
            color: #0066cc;
            text-decoration: none;
        }
        .impro-message a:hover {
            text-decoration: underline;
        }
        .impro-user-message {
            background-color: #a8d2ff;
            color: #333;
            float: right;
        }
        .impro-assistant-message {
            background-color: #4a90e2;
            color: white;
            float: left;
        }
        .impro-chat-input {
            display: flex;
            padding: 10px;
            background-color: #f0f0f0;
        }
        .impro-chat-input input {
            flex: 4;
            padding: 10px;
            border: 1px solid #4a90e2;
            border-radius: 20px;
            margin-right: 10px;
        }
        .impro-chat-input button {
            flex: 1;
            background-color: #4a90e2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            cursor: pointer;
            white-space: nowrap;
        }
        .impro-chat-input button:hover {
            background-color: #3a7bc8;
        }
        .impro-chat-input input:disabled {
            background-color: #e0e0e0;
            cursor: not-allowed;
        }
        .impro-chat-input button:disabled {
            background-color: #a0a0a0;
            cursor: not-allowed;
        }
        .impro-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 24px;
        }
        .impro-loading-dot {
            background-color: #fff;
            border-radius: 50%;
            width: 8px;
            height: 8px;
            margin: 0 4px;
            animation: impro-loading 1.4s infinite ease-in-out both;
        }
        .impro-loading-dot:nth-child(1) { animation-delay: -0.32s; }
        .impro-loading-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes impro-loading {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
    `;

    // Inject chat modal and styles
    document.body.insertAdjacentHTML('beforeend', chatModalHTML);
    document.head.insertAdjacentHTML('beforeend', `<style>${chatStyles}</style>`);

    let threadId = null;
    const chatModal = document.getElementById('improChatModal');
    const chatForm = document.getElementById('improChatForm');
    const userInput = document.getElementById('improUserInput');
    const conversation = document.getElementById('improConversation');

    // Define the base URL based on the current environment
    const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:5000'
        : 'https://impro-form.onrender.com';

    // Define axios config with headers
    const axiosConfig = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        withCredentials: false
    };

    function attachChatToForm(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            let userMessage = '';
            for (let [key, value] of formData.entries()) {
                userMessage += `${key}: ${value}\n`;
            }

            // Show chat modal
            chatModal.style.display = 'block';

            // Process the initial message without displaying it
            await processMessage(userMessage, true);
        });
    }

    // Attach chat to forms with specified IDs and all other forms
    const formIds = ['initialForm', 'contactForm', 'contact'];
    const specificForms = formIds.map(id => document.getElementById(id)).filter(form => form);
    const allForms = Array.from(document.getElementsByTagName('form'));

    const formsToAttach = new Set([...specificForms, ...allForms]);
    console.log("Attaching to forms: ");
    console.log(formsToAttach);

    formsToAttach.forEach(form => {
        attachChatToForm(form);
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        userInput.value = ''; // Clear input immediately
        await processMessage(userMessage);
    });

    async function processMessage(userMessage, isInitial = false) {
        if (!isInitial) {
            addMessageToConversation('User', userMessage);
        }
        const loadingIndicator = addLoadingIndicator();
        setInputState(false); // Disable input

        try {
            let response;
            if (!threadId) {
                response = await axios.post(`${baseURL}/api/start-conversation`,
                    { message: userMessage },
                    axiosConfig
                );
                threadId = response.data.thread_id;
            } else {
                response = await axios.post(`${baseURL}/api/send-message`,
                    { thread_id: threadId, message: userMessage },
                    axiosConfig
                );
            }

            loadingIndicator.remove();
            addMessageToConversation('Assistant', response.data.response);
        } catch (error) {
            console.error('Error:', error);
            loadingIndicator.remove();
            addMessageToConversation('Error', 'An error occurred while processing your request.');
        } finally {
            setInputState(true); // Re-enable input
        }
    }

    function setInputState(enabled) {
        userInput.disabled = !enabled;
        chatForm.querySelector('button').disabled = !enabled;
    }

    function addMessageToConversation(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.className = `impro-message impro-${sender.toLowerCase()}-message`;

        if (sender === 'Assistant') {
            messageElement.innerHTML = parseMarkdown(message);
        } else {
            messageElement.textContent = message;
        }

        conversation.appendChild(messageElement);
        conversation.scrollTop = conversation.scrollHeight;
    }

    function parseMarkdown(text) {
        // Convert line breaks
        text = text.replace(/\n/g, '<br>');

        // Convert bold text
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Convert italic text
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Convert links
        text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        // Wrap paragraphs
        const paragraphs = text.split('<br><br>');
        return paragraphs.map(p => `<p>${p}</p>`).join('');
    }

    function addLoadingIndicator() {
        const loadingElement = document.createElement('div');
        loadingElement.className = 'impro-message impro-assistant-message impro-loading';
        loadingElement.innerHTML = '<div class="impro-loading-dot"></div><div class="impro-loading-dot"></div><div class="impro-loading-dot"></div>';
        conversation.appendChild(loadingElement);
        conversation.scrollTop = conversation.scrollHeight;
        return loadingElement;
    }

    // Close the modal when clicking outside of it
    window.onclick = function (event) {
        if (event.target == chatModal) {
            chatModal.style.display = "none";
        }
    }
})();