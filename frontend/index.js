    import { local, backendUrl } from "./configuration.js";

    const answerElement = document.getElementById("answer-field");
    const errorElement = document.getElementById("error-field");
    const answerDiv = document.getElementById("answer-div");

    const send = async (event) => {
        event.preventDefault();

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
                throw new Error("Failed to get an answer from AI.");
            }
            const data = await response.json();
            if (!errorElement.classList.contains("hidden")) errorElement.classList.add("hidden");
            if (answerDiv.classList.contains("hidden")) answerDiv.classList.remove("hidden");
            answerElement.innerText = data.text;

        } catch (error) {
            if (local) console.log("Error getting answer from AI:", error);
            errorElement.innerText = "Failed to get an answer from AI.";
            if (errorElement.classList.contains("hidden")) {
                errorElement.classList.remove("hidden");
                answerDiv.classList.add("hidden");
            }
        }
    };
    window.send = send;