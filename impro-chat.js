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
            margin-bottom: 10px;
            padding: 10px;
            border-radius: 10px;
            clear: both;
        }
        .impro-user-message {
            background-color: #4a90e2;
            color: white;
            float: right;
        }
        .impro-assistant-message {
            background-color: white;
            color: #333;
            float: left;
        }
        .impro-chat-input {
            display: flex;
            padding: 10px;
            background-color: #f0f0f0;
        }
        .impro-chat-input input {
            flex: 1;
            padding: 10px;
            border: 1px solid #4a90e2;
            border-radius: 20px;
            margin-right: 10px;
        }
        .impro-chat-input button {
            background-color: #4a90e2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            cursor: pointer;
        }
        .impro-chat-input button:hover {
            background-color: #3a7bc8;
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

            // Process the initial message
            await processMessage(userMessage);
        });
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        await processMessage(userMessage);
    });

    async function processMessage(userMessage) {
        addMessageToConversation('User', userMessage);

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

            addMessageToConversation('Assistant', response.data.response);
        } catch (error) {
            console.error('Error:', error);
            addMessageToConversation('Error', 'An error occurred while processing your request.');
        }

        // Clear the input field
        userInput.value = '';
    }

    function addMessageToConversation(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender.toLowerCase()}-message`;
        messageElement.textContent = message;
        conversation.appendChild(messageElement);
        conversation.scrollTop = conversation.scrollHeight;
    }

    // Close the modal when clicking outside of it
    window.onclick = function (event) {
        if (event.target == chatModal) {
            chatModal.style.display = "none";
        }
    }

    // Attach chat to form with specified IDs
    const formIds = ['initialForm', 'contactForm', 'contact'];
    formIds.forEach(id => {
        const form = document.getElementById(id);
        if (form) {
            attachChatToForm(form);
        }
    });
})();