"use client";
import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [response, setResponse] = useState("");

  const sendData = async () => {
    const res = await fetch("/api/hello", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();
    setResponse(data.message);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>My First Full Stack App</h1>

      <input
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button 
       onClick={sendData} 
       style={{ marginLeft: 10, padding: "6px 12px", cursor: "pointer" }}
      > 
       Send
      </button>

      <p>{response}</p>
    </div>
  );
}