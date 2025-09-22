import { local, backendUrl } from "./configuration.js";

const answerElement = document.getElementById("answer-field");
const answererElement = document.getElementById("answerer");
const errorElement = document.getElementById("error-field");
const answerDiv = document.getElementById("answer-div");
if (answerElement.innerText.length === 0 && !answerDiv.classList.contains("hidden")) {
    answerDiv.classList.add("hidden");
}
const send = async (event) => {
    event.preventDefault();

    if (answerElement.innerText.length !== 0) answerElement.innerText += '\n\n'

    const questionText = document.getElementById("question-box").value;
    if (local) console.log("QUESTION:", questionText);

    // Send question to backend and wait for answer
    try {
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: questionText
            })
        })
        if (!response.ok) {
            console.log(response);
            throw new Error("Failed to get an answer from AI.");
        }
        
        //const data = await response.json();

        if (!errorElement.classList.contains("hidden")) errorElement.classList.add("hidden");
        if (answerDiv.classList.contains("hidden")) answerDiv.classList.remove("hidden");
        answererElement.innerText = "AI Assistant:";

        // Stream reader
        const reader = response.body.getReader();

        let index = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const message = new TextDecoder().decode(value);
            console.log(`Received ${index}:`, message);

            // At some point the message (JSON string) seems to include at least two JSON objects -> JSON.parse raises error. As a quick fix let's split these messages.
            console.log("TRUE OR FALSE:" ,message.includes("false}{"))
            if (message.includes("false}{")) {
                const messages = message.split("false}{"); // could be 2 or more messages
                let currentMessage;
                for (let i = 0; i ++; i < messages.length){ // first
                    if (i === 0){
                        currentMessage = messages[i] + "false}";
                    }
                    else if (i === messages.length - 1){    // last
                        currentMessage = "{" + messages[i];
                        
                    } else{ // the rest of parts
                        currentMessage = "{" + messages[i] + "false}";
                    } 
                    answerElement.innerText += JSON.parse(currentMessage)["response"];
                } 
                if (local) console.log(`SPLIT ERROR MESSAGE: ${index}`)
            }
            else answerElement.innerText += JSON.parse(message)["response"];
            index ++;
        }

    } catch (error) {
        if (local) console.log("Error getting answer from AI:", error);
        errorElement.innerText = "Failed to get an answer from AI.";
        if (errorElement.classList.contains("hidden")) {
            errorElement.classList.remove("hidden");
            //answerDiv.classList.add("hidden");
        }
    }
};
window.send = send;