import ollama from "ollama";

const response = await ollama.chat({
  model: "gemma3:1b",
  messages: [{ role: "user", content: "Say hello in one word" }],
  options: { num_predict: 3 }
});

console.log(response.message.content);
