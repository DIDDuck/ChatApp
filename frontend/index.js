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

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const message = new TextDecoder().decode(value);
            console.log('Received:', message);
            answerElement.innerText += JSON.parse(message)["response"];
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