<script>
import api from "@/api";
export default {
    name: "ChatList",
    data() {
        return {
            msg: "Chat with GPT-3.5",
            chats: [{
                propmt: "you can type any text to start chat with ChatGPT-3.5",
                choices: [{
                    "message": {
                        "role": "assistant",
                        "content": "ChatGPT will resposne here."
                    },
                    "finish_reason": "stop",
                    "index": 0
                }]
            }],
            prompt: "",
            loading: false,
        };
    },
    async created() {
        this.refresh();
    },
    methods: {
        async refresh() {
            this.listChats();
        },
        async completeChat() {
            this.loading = true;
            let prompt = this.prompt;
            let newChat = await api.newChat(prompt);
            this.chats = this.chats.concat(newChat);
            this.loading = false;
        },
        async listChats() {
            this.loading = true;
            let chatRecords = await api.listChats();
            if (chatRecords && chatRecords.length > 0) {
                this.chats = chatRecords.map(record => {
                    let chat = JSON.parse(record.response);
                    chat.propmt = record.propmt;
                    return chat
                });
            }
            this.loading = false;
        },
    },
};
</script>

<template>
    <div class="greetings">
        <h1 class="green">{{ msg || "Chat with OpenAI GPT-3.5" }}</h1>
    </div>
    <div class="chat-list">
        <ul>
            <li v-for="chat in chats" :key="chat.prompt">
                <p class="chat-propmt">{{ chat.propmt }}</p>
                <p class="chat-propmt">{{ chat.choices[0].message.content }}</p>
            </li>
        </ul>
    </div>
    <div class="new-chat">
        <textarea id="prompt-textarea" type="textarea" v-model="prompt" class="new-chat-box" />
        <p></p>
        <button value="chat" @click="completeChat()" class="new-chat-btn">chat</button>
    </div>
</template>

<style scoped>
h1 {
    font-weight: 500;
    font-size: 2.6rem;
    top: -10px;
}

h3 {
    font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
    text-align: center;
}

.new-chat .new-chat-box {
    padding: 10px;
    width: 30vw;
    max-width: 30vw;
    min-width: 30vw;
    max-height: 300px;
    min-height: 50px;
}

.new-chat .new-chat-btn {
    padding: 5px 10px;
}

@media (min-width: 1024px) {

    .greetings h1,
    .greetings h3 {
        text-align: left;
    }
}
</style>
