<script>
import api from "@/api";
export default {
    name: "ChatList",
    data() {
        return {
            msg: "Chat with GPT-3.5",
            warn_msg: "",
            refer_previous: false,
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
            chat_count: 10,
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
            this.warn_msg = "";
            let prompt = this.prompt;
            if (!prompt || prompt.length <= 5) {
                this.warn_msg = "invalid prompt";
                this.loading = false;
                this.prompt = "";
                return;
            }
            let newChat = await api.newChat(prompt, this.refer_previous);
            this.chats = this.chats.concat(newChat);
            this.loading = false;
            this.prompt;
        },
        async listChats() {
            this.loading = true;
            let chatRecords = await api.listChats(this.chat_count);
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
        <h1 class="green">{{ "Chat with OpenAI GPT-3.5" }}</h1>
    </div>
    <div class="chat-list">
        <ul class="chat-list-ul">
            <li v-for="chat in chats" :key="chat.prompt" class="single-chat">
                <p class="chat-propmt">{{ chat.propmt }}</p>
                <p class="chat-response">
                    {{ chat.choices[0].message.content }}
                </p>
            </li>
        </ul>
    </div>
    <div class="new-chat">
        <textarea placeholder="type anything you want to start conversation with GPT-3.5" id="prompt-textarea"
            type="textarea" v-model="prompt" class="new-chat-box" />
        <p>
            <button value="chat" @click="completeChat()" :disabled="loading" class="new-chat-btn">chat</button>
            <label>
                <input type="checkbox" style="margin: 0 5px 0 20px;" v-model="refer_previous"
                    id="checkbox_refer_previous" />
                Refer previous chats</label>
        </p>
        <p style="min-height: 30px;">
            <span :hidden="!loading" style="color: hsla(200, 90%, 37%, 1);">waiting server response...
            </span>
            <span style="color: red;" :class="{ hide: !warn_msg || warn_msg.length <= 0 }">{{ warn_msg }}
            </span>
        </p>
    </div>
</template>

<style scoped>
.hide {
    visibility: hidden !important;
}

h1 {
    font-weight: 500;
    font-size: 2.6rem;
    top: -10px;
}

.chat-list-ul {
    list-style: none;
    padding: 0 0 20px 0;
}

.chat-list-ul li.single-chat {
    background-color: ghostwhite;
    margin-bottom: 20px;
}

h3 {
    font-size: 1.2rem;
}

.single-chat p {
    padding: 5px;
}

p.chat-response {
    white-space: pre-wrap;
}

p.chat-propmt {
    white-space: pre-wrap;
    background-color: hsla(200, 100%, 90%, 1);
    margin-bottom: 10px;
}

.greetings h1,
.greetings h3 {
    text-align: center;
}

.new-chat .new-chat-box {
    padding: 10px;
    width: 100%;
    max-width: 100vw;
    /* min-width: 100vw; */
    max-height: 300px;
    min-height: 50px;
}

.new-chat .new-chat-btn {
    padding: 5px 10px;
    background-color: hsla(160, 100%, 37%, 1);
    color: white;
    border: none;
    border-radius: 5px;
    font-size: larger;
}

.new-chat .new-chat-btn:hover {
    background-color: hsla(160, 100%, 80%, 1);
    cursor: pointer;
}

.new-chat .new-chat-btn:active {
    background-color: hsla(160, 100%, 60%, 1);
}

.new-chat .new-chat-btn:disabled {
    background-color: lightgrey;
}

@media (min-width: 1024px) {

    .greetings h1,
    .greetings h3 {
        text-align: left;
    }
}
</style>
