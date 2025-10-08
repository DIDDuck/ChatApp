import { local, backendUrl } from "./configuration.js";

const loadChatsFromStorage = () => {
    return JSON.parse(localStorage.getItem("chats")) ?? [];    
};

const errorElement = document.getElementById("error-field");
const messagesDiv = document.getElementById("messages-div");
const md = window.markdownit({ html: false });
let chatsFromLocalStorage = loadChatsFromStorage();
if (local) console.log("CHATS FROM LS:", chatsFromLocalStorage)

let messages = []; // We want to save the whole conversation
let currentChat = { id: new Date().toUTCString(), messages: messages };

if (messagesDiv.querySelectorAll("div").length === 0 && !messagesDiv.classList.contains("hidden")) {
    messagesDiv.classList.add("hidden");
}

const send = async (event) => {
    event.preventDefault();

    // Disable using send button before we get a reply for current message
    const sendButton = document.getElementById("send-button");
    sendButton.setAttribute("disabled", "");
    // Also let's disable end chat button while waiting for answer
    document.getElementById("end-chat-button").setAttribute("disabled", "");

    // Get form values
    const userMessageText = document.getElementById("user-message-box").value;
    const streamCheckbox = document.getElementById("stream-checkbox");
    if (local) console.log("USER MESSAGE:", userMessageText);
    messages.push({
        role: "user",
        content: userMessageText
    })

    // Insert user message to conversation box
    messagesDiv.appendChild(createMessageDiv("User:", userMessageText, messagesDiv));
    messagesDiv.classList.remove("hidden");
    document.getElementById("user-message-box").value = "";

    // Do we want AI Assistant message streamed or in one piece
    const stream = streamCheckbox.checked ? true : false;

    const errorMessageForUser = "Failed to get an answer from AI."

    // Send question to backend and wait for answer
    try {
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: userMessageText,
                stream: stream,
                messages: messages
            })
        })
        if (!response.ok) {
            if (local) console.log(response);
            throw new Error(errorMessageForUser);
        }

        if (!errorElement.classList.contains("hidden")) errorElement.classList.add("hidden");
        
        // Stream reader
        if (stream) {
            const newMessageDiv = createMessageDiv("AI Assistant:", "", messagesDiv);

            const reader = response.body.getReader();

            let index = 0;
            while (true) {
                const { done, value } = await reader.read();

                if (done) break; // If stream ended, stop waiting for messages

                const message = new TextDecoder().decode(value);
                if (local) console.log(`Received ${index}:`, message);

                messagesDiv.appendChild(newMessageDiv);

                // At some point the message (JSON string) seems to include at least two JSON objects -> JSON.parse raises error. As a quick fix let's split these messages.
                if (local) console.log("TRUE OR FALSE:", message.includes("false}{"))
                if (message.includes("false}{")) {
                    const partMessages = message.split("false}{"); // could be 2 or more partMessages
                    let currentMessage;
                    for (let i = 0; i++; i < partMessages.length) { // first
                        if (i === 0) {
                            currentMessage = partMessages[i] + "false}";
                        }
                        else if (i === partMessages.length - 1) {    // last
                            currentMessage = "{" + partMessages[i];

                        } else { // the rest of parts
                            currentMessage = "{" + partMessages[i] + "false}";
                        }
                        // Depending on backend actions reply message text may be one of two: ["response"] or ["message"]["content"]
                        newMessageDiv.querySelector("div").innerText += JSON.parse(currentMessage)["response"] ?? JSON.parse(currentMessage)["message"]["content"];
                    }
                    if (local) console.log(`SPLIT ERROR MESSAGE: ${index}`)
                }
                else {
                    // If handled error sent from backend, stop waiting for messages
                    if (JSON.parse(message).error) {
                        if (JSON.parse(message).message) setErrorElement(errorElement, JSON.parse(message).message);
                        else setErrorElement(errorElement, errorMessageForUser);
                        break;
                    }
                    newMessageDiv.querySelector("div").innerText += JSON.parse(message)["response"] ?? JSON.parse(message)["message"]["content"];
                }
                index++;
            }
            // When text is complete, convert from markdown to html, and add complete reply to messages
            const completeText = newMessageDiv.querySelector("div").innerText;
            messages.push({
                role: "assistant",
                content: completeText
            });
            saveChatToLocalStorage(currentChat, chatsFromLocalStorage);
            if (local) console.log("MESSAGES:", messages);
            newMessageDiv.querySelector("div").innerText = "";
            newMessageDiv.querySelector("div").innerHTML = md.render(completeText);
            document.getElementById("end-chat-button").removeAttribute("disabled");

        // Read response in one piece
        } else {
            const data = await response.json();
            if (local) console.log("DATA: ", data);
            
            messages.push({
                role: "assistant",
                content: data.text
            });
            saveChatToLocalStorage(currentChat, chatsFromLocalStorage);
            if (local) console.log("MESSAGES:", messages);
            if (data.error) {
                setErrorElement(errorElement, data.message);
            } else {
                messagesDiv.appendChild(createMessageDiv("AI Assistant:", data.text, messagesDiv));
            }
        }
        applyColorTheme();
        sendButton.removeAttribute("disabled");

    } catch (error) {
        if (local) console.log("Error getting answer from AI:", error);
        setErrorElement(errorElement, errorMessageForUser);
        sendButton.removeAttribute("disabled");
    }
};

const createMessageDiv = (role, text, parent ) => {
    const messageDiv = document.createElement("div");
    
    // If already some messages in parent, add margin and if dark theme apply it
    if (parent.querySelectorAll("div").length !== 0){
        messageDiv.classList.add("mt-20");
    }
    // Are we in dark mode? 
    if (document.body.classList.contains("dark")) {
            messageDiv.classList.add("dark");
        }
    
    const messageRole = document.createElement("p");
    messageRole.classList.add("bold", "mb-10");
    messageRole.innerText = role;
    const messageText = document.createElement("div");
    messageText.classList.add("mx-10", "pre")
    messageText.innerHTML = md.render(text);
    messageDiv.appendChild(messageRole);
    messageDiv.appendChild(messageText);

    return messageDiv;
};

const changeColorTheme = () => {
    document.body.classList.toggle("dark");
    document.getElementById("user-message-box").classList.toggle("dark");
    document.getElementById("messages-div").classList.toggle("dark");
    document.getElementsByClassName("container")[0].classList.toggle("dark");
    document.getElementsByClassName("chats-list")[0].classList.toggle("dark")

    document.querySelectorAll("#messages-div>div").forEach(element => {
        element.classList.toggle("dark")
    });
    document.querySelectorAll("#messages-div code").forEach(element => {
        element.classList.toggle("dark")
    });
};


const applyColorTheme = () => {
    const darkMode = document.body.classList.contains("dark") ? true : false
    // Some elements that we want different classes have been created after theme change, code blocks for example
    if (darkMode) {
        document.querySelectorAll("#messages-div code").forEach(element => {
        const isDark =  element.classList.contains("dark");
        if (!isDark) element.classList.add("dark");
        });
    } else {
        document.querySelectorAll("#messages-div code").forEach(element => {
        const isDark =  element.classList.contains("dark");
        if (isDark) element.classList.remove("dark");
        });
    }
};

const setErrorElement = (errorElement, message) => {
    errorElement.innerText = message;
    if (errorElement.classList.contains("hidden")) {
        errorElement.classList.remove("hidden");
    }
};

const saveChatToLocalStorage = (chat, chats) => {
    if (chats.filter(c => c.id === chat.id).length === 0) { // Chat was not loaded from localStorage
        chats.push(chat);
    } else {
        chats.forEach(c => { // Chat was loaded from localStorage, let's update the existing one
            if (c.id === chat.id) c.messages = chat.messages;
        });
    }
    localStorage.setItem("chats", JSON.stringify(chats));
};

const confirmChatDelete = (chatId) => {
    const confirmBgDiv = document.createElement("div");
    confirmBgDiv.id = "confirm-bg-div";

    const confirmDiv = document.createElement("div");
    confirmDiv.id = "confirm-delete";

    confirmDiv.innerHTML = `
        <p>Are you sure you want to delete this chat?</p>
        <div class="mt-20 flex between">
            <button onclick="confirmChatDeleteYes('${chatId}')">Yes</button>
            <button onclick="confirmChatDeleteNo()">No</button>
        </div>     
    `
    const chatsList = document.getElementsByClassName("chats-list")[0];
    chatsList.appendChild(confirmBgDiv);
    chatsList.appendChild(confirmDiv);
};

const confirmChatDeleteNo = () => {
    const chatsList = document.getElementsByClassName("chats-list")[0];
    chatsList.removeChild(document.getElementById("confirm-delete"));
    chatsList.removeChild(document.getElementById("confirm-bg-div"));
};

const confirmChatDeleteYes = (chatId) => {
    const chatsList = document.getElementsByClassName("chats-list")[0];
    chatsList.removeChild(document.getElementById("confirm-delete"));
    chatsList.removeChild(document.getElementById("confirm-bg-div"));
    deleteSavedChat(chatId);
};

const toggleMenu = (direction) => {
    const chatsList = document.getElementsByClassName("chats-list")[0];
    let content = "";
    if (chatsList.classList.contains("hidden")) {
        const ul = document.createElement("ul");
        chatsFromLocalStorage.toReversed().forEach(chat => {
            content += `
            <li>
                <div class="flex">
                    <p data-id="${chat.id}" onClick="loadSavedChat('${chat.id}')">${chat.messages[0].content}</p>    
                    <button class="left-button" onClick="confirmChatDelete('${chat.id}')">Delete</button>
                </div>
            </li>\n
            `;
        })
        ul.innerHTML = content;
        chatsList.appendChild(ul);
    }
    if (direction === "open") {
        chatsList.style.animationName = "chatListOpen";
        chatsList.classList.toggle("hidden");
    };
    if (direction === "close") {
        chatsList.style.animationName = "chatListClose";
        setTimeout(() => {
            chatsList.classList.toggle("hidden");
            if (chatsList.getElementsByTagName("ul").length >= 1) chatsList.removeChild(chatsList.getElementsByTagName("ul")[0]);
        }, 1000);
    }
};


const deleteSavedChat = (chatId) => {
    const updatedChatsList = chatsFromLocalStorage.filter(c => c.id !== chatId && "id" in c );
    localStorage.setItem("chats", JSON.stringify(updatedChatsList)); // Update list in localStorage
    chatsFromLocalStorage = loadChatsFromStorage(); // Update local copy of list
    // Remove deleted chat from DOM list
    const elementToRemove = document.querySelector(`.chats-list ul li:has(div>p[data-id="${chatId}"])`);
    elementToRemove.parentElement.removeChild(elementToRemove);
};

const endChat = () => {
    messages = [];
    messagesDiv.innerHTML = "";
    currentChat = { id: new Date().toUTCString(), messages: messages };
    messagesDiv.classList.add("hidden");
    document.getElementById("end-chat-button").setAttribute("disabled", "");
};

const loadSavedChat = (chatId) => {
    // Let's end current chat
    endChat();
    // Load current chat from saved chats and set local variables
    const loadedChat = chatsFromLocalStorage.filter(c => c.id === chatId)[0];
    messages = loadedChat.messages;
    const id = loadedChat.id;
    currentChat = { id: id, messages: messages };
    // Go through all the messages in chat and add them in messagesDiv
    messages.forEach(message => {
        if (message.role === "user") {
            messagesDiv.appendChild(createMessageDiv("User:", message.content, messagesDiv));
            if (messagesDiv.classList.contains("hidden")) messagesDiv.classList.remove("hidden");    
        }
        if (message.role === "assistant") {
            messagesDiv.appendChild(createMessageDiv("AI Assistant:", message.content, messagesDiv));
        }
    })
    document.getElementById("end-chat-button").removeAttribute("disabled");
    toggleMenu('close');
};

window.send = send;
window.changeColorTheme = changeColorTheme;
window.toggleMenu = toggleMenu;
window.loadSavedChat = loadSavedChat;
window.deleteSavedChat = deleteSavedChat;
window.endChat = endChat;
window.confirmChatDelete = confirmChatDelete;
window.confirmChatDeleteNo = confirmChatDeleteNo;
window.confirmChatDeleteYes = confirmChatDeleteYes;