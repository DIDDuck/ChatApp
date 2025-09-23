import { local, backendUrl } from "./configuration.js";

const errorElement = document.getElementById("error-field");
const messagesDiv = document.getElementById("messages-div");

if (messagesDiv.querySelectorAll("div").length === 0 && !messagesDiv.classList.contains("hidden")) {
    messagesDiv.classList.add("hidden");
}

const send = async (event) => {
    event.preventDefault();

    // Get form values
    const userMessageText = document.getElementById("user-message-box").value;
    const streamCheckbox = document.getElementById("stream-checkbox");
    if (local) console.log("QUESTION:", userMessageText);

    // Insert user message to conversation box
    messagesDiv.appendChild(createMessageDiv("User:", userMessageText, messagesDiv));
    messagesDiv.classList.remove("hidden");
    document.getElementById("user-message-box").value = "";

    // Do we want AI Assistant message streamed or in one piece
    const stream = streamCheckbox.checked ? true : false;

    // Send question to backend and wait for answer
    try {
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: userMessageText,
                stream: stream
            })
        })
        if (!response.ok) {
            console.log(response);
            throw new Error("Failed to get an answer from AI.");
        }

        if (!errorElement.classList.contains("hidden")) errorElement.classList.add("hidden");
        
        // Stream reader
        if (stream) {
            const newMessageDiv = createMessageDiv("AI Assistant:", "", messagesDiv);
            messagesDiv.appendChild(newMessageDiv);

            const reader = response.body.getReader();

            let index = 0;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const message = new TextDecoder().decode(value);
                if (local) console.log(`Received ${index}:`, message);

                // At some point the message (JSON string) seems to include at least two JSON objects -> JSON.parse raises error. As a quick fix let's split these messages.
                console.log("TRUE OR FALSE:", message.includes("false}{"))
                if (message.includes("false}{")) {
                    const messages = message.split("false}{"); // could be 2 or more messages
                    let currentMessage;
                    for (let i = 0; i++; i < messages.length) { // first
                        if (i === 0) {
                            currentMessage = messages[i] + "false}";
                        }
                        else if (i === messages.length - 1) {    // last
                            currentMessage = "{" + messages[i];

                        } else { // the rest of parts
                            currentMessage = "{" + messages[i] + "false}";
                        }
                        newMessageDiv.querySelectorAll("p")[1].innerText += JSON.parse(currentMessage)["response"];
                    }
                    if (local) console.log(`SPLIT ERROR MESSAGE: ${index}`)
                }
                else newMessageDiv.querySelectorAll("p")[1].innerText += JSON.parse(message)["response"];
                index++;
            }
        // Read response in one piece
        } else {
            const data = await response.json();
            if (local) console.log("DATA: ", data);
            messagesDiv.appendChild(createMessageDiv("AI Assistant:", data.text, messagesDiv));
        } 

    } catch (error) {
        if (local) console.log("Error getting answer from AI:", error);
        errorElement.innerText = "Failed to get an answer from AI.";
        if (errorElement.classList.contains("hidden")) {
            errorElement.classList.remove("hidden");
        }
    }
};

const createMessageDiv = (role, text, parent ) => {
    const messageDiv = document.createElement("div");
    
    // If already some messages in parent, add margin
    if (parent.querySelectorAll("div").length !== 0){
        messageDiv.classList.add("mt-10");
    }
    
    const messageRole = document.createElement("p");
    messageRole.classList.add("bold");
    messageRole.innerText = role;
    const messageText = document.createElement("p");
    messageText.classList.add("mx-10")
    messageText.innerText = text;
    messageDiv.appendChild(messageRole);
    messageDiv.appendChild(messageText);

    return messageDiv;
} 

window.send = send;