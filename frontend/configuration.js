export const local = true; // False means production
const production = window.location.origin + "/api/chat"; // Gets your backend address from address bar (assumes backend is running on same host)

export const backendUrl = local ? "http://127.0.0.1:5000/chat" : production;