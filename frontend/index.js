import { local, backendUrl } from "./configuration.js";

const errorElement = document.getElementById("error-field");
const messagesDiv = document.getElementById("messages-div");
const md = window.markdownit({ html: false });
const chatsFromLocalStorage = JSON.parse(localStorage.getItem("chats")) ?? [];
console.log("CHATS FROM LS:", chatsFromLocalStorage)

const messages = []; // We want to save the whole conversation
const currentChat = { id: new Date().toUTCString(), messages: messages };

if (messagesDiv.querySelectorAll("div").length === 0 && !messagesDiv.classList.contains("hidden")) {
    messagesDiv.classList.add("hidden");
}

const send = async (event) => {
    event.preventDefault();

    // Disable using send button before we get a reply for current message
    const sendButton = document.getElementById("send-button");
    sendButton.setAttribute("disabled", "");

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
            console.log(response);
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
                console.log("TRUE OR FALSE:", message.includes("false}{"))
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

const toggleMenu = () => {
    const chatsList = document.getElementsByClassName("chats-list")[0];
    let content = "";
    if (chatsList.classList.contains("hidden")) {
        const ul = document.createElement("ul");
        chatsFromLocalStorage.toReversed().forEach(chat => {
            content += `
            <li>
                <div class="flex">
                    <p onClick="loadSavedChat()">${chat.messages[0].content}</p>    
                    <button class="left-button" onClick="deleteSavedChat()">Delete</button>
                </div>
            </li>\n
            `;
        })
        ul.innerHTML = content;
        chatsList.appendChild(ul);
    } else {
        if (chatsList.getElementsByTagName("ul").length >= 1) chatsList.removeChild(chatsList.getElementsByTagName("ul")[0]);
    }
    chatsList.classList.toggle("hidden");
    
};

const loadSavedChat = () => {
    console.log("testing load");
};

const deleteSavedChat = () => {
    console.log("testing delete");
};


window.send = send;
window.changeColorTheme = changeColorTheme;
window.toggleMenu = toggleMenu;
window.loadSavedChat = loadSavedChat;
window.deleteSavedChat = deleteSavedChat;