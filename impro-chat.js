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
        .impro-close-button {
            position: absolute;
            right: 10px;
            top: 10px;
            background: none;
            border: none;
            color: white;
            font-size: 16px;
            cursor: pointer;
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

    let currentForm = null;
    let chatSummary = '';
    let capturedEvents = [];

    function attachChatToForm(form) {
        const submitButton = form.querySelector('input[type="submit"], button[type="submit"]');

        if (submitButton) {
            // Capture and remove existing event listeners
            const clonedButton = submitButton.cloneNode(true);
            submitButton.parentNode.replaceChild(clonedButton, submitButton);

            // Attach our new submit handler
            form.addEventListener('submit', handleSubmit);
        } else {
            // If no submit button found, just attach our handler to the form
            form.addEventListener('submit', handleSubmit);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        currentForm = e.target;

        // Capture form data
        let userMessage = '';
        for (let element of currentForm.elements) {
            if ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') &&
                !element.hidden &&
                isVisible(element) &&
                element.type !== 'submit' &&
                element.type !== 'button') {

                let key = element.name || element.id;
                if (!key) {
                    key = findLabelForElement(element);
                }
                const value = element.value;
                if (key && value) {
                    userMessage += `${key}: ${value}\n`;
                }
            }
        }

        chatSummary = userMessage; // Initialize chat summary with form data

        // Show chat modal
        chatModal.style.display = 'block';

        // Process the initial message without displaying it
        await processMessage(userMessage, true);
    }

    function isVisible(element) {
        return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
    }

    function findLabelForElement(element) {
        // First, try to find a label that references this element by its id
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) return label.textContent.trim();
        }

        // If no label found, look for a parent label
        let parent = element.parentElement;
        while (parent) {
            if (parent.tagName === 'LABEL') {
                return parent.textContent.trim();
            }
            parent = parent.parentElement;
        }

        // If still no label found, look for preceding label sibling
        let sibling = element.previousElementSibling;
        while (sibling) {
            if (sibling.tagName === 'LABEL') {
                return sibling.textContent.trim();
            }
            sibling = sibling.previousElementSibling;
        }

        // If no label found, return a default string
        return 'Unlabeled Field';
    }

    // Attach chat to forms with specified IDs and all other forms
    const formIds = ['initialForm', 'contactForm', 'contact'];
    const specificForms = formIds.map(id => document.getElementById(id)).filter(form => form);
    const allForms = Array.from(document.getElementsByTagName('form'));

    const formsToAttach = new Set([...specificForms, ...allForms]);

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
            chatSummary += `\nUser: ${userMessage}`; // Add user message to summary
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
            chatSummary += `\nAssistant: ${response.data.response}`; // Add assistant response to summary
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
            closeChatAndSubmitForm();
        }
    }

    function closeChatAndSubmitForm() {
        chatModal.style.display = "none";
        if (currentForm) {
            // Find or create a hidden input for the chat summary
            let summaryInput = currentForm.querySelector('input[name="chat_summary"]');
            if (!summaryInput) {
                summaryInput = document.createElement('input');
                summaryInput.type = 'hidden';
                summaryInput.name = 'chat_summary';
                currentForm.appendChild(summaryInput);
            }
            summaryInput.value = chatSummary;

            // Trigger the original submit event
            const submitEvent = new Event('submit', {
                bubbles: true,
                cancelable: true
            });
            currentForm.dispatchEvent(submitEvent);

            // Reset variables
            currentForm = null;
            chatSummary = '';
            threadId = null;
        }
    }

    // Add a close button to the chat modal
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'impro-close-button';
    closeButton.onclick = closeChatAndSubmitForm;
    document.querySelector('.impro-chat-header').appendChild(closeButton);
})();