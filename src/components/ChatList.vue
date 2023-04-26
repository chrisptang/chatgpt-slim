<script>
import api from "@/api";
import { useRoute } from "vue-router";
export default {
    name: "ChatList",
    data() {
        return {
            msg: "Chat with GPT-3.5",
            warn_msg: "",
            counting_num: 1,
            counting_timeout: null,
            // refer_previous: false,
            chats: [{
                id: 0,
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
    updated() {
        console.log("updated");
        const container = this.$refs.codeContainer;
        const copyButtons = container.querySelectorAll('.copy-code-button');
        copyButtons.forEach(button => {
            button.addEventListener('click', this.handleCopyCode);
        });
    },
    async created() {
        this.refresh();
    },
    methods: {
        async refresh() {
            this.listChats();
        },
        async startCounting() {
            this.loading = true;
            this.counting_timeout = setInterval(function () { this.counting_num++; }.bind(this), 1000);
        },
        async endCounting() {
            if (this.counting_timeout > 0) {
                this.counting_num = 0;
                window.clearInterval(this.counting_timeout);
            }
            this.loading = false;
        },
        async completeChatChunked() {
            this.warn_msg = "";
            let prompt = this.prompt;
            if (!prompt || prompt.length <= 5) {
                this.warn_msg = "invalid prompt";
                this.prompt = "";
                return;
            }
            let newChat = await api.createChat(prompt);
            newChat = this.converResponseToChat(newChat);
            if (!this.chats || (this.chats.length == 1 && this.chats[0].id <= 0)) {
                this.chats = [newChat]
            } else {
                this.chats = this.chats.concat(newChat);
            }
            this.prompt = "";
            await this.completeChatChunkedById(newChat.id, { prompt });
        },
        async completeChatChunkedById(id, data = {}) {
            this.startCounting();
            await api.completeChatChunked(id, data, async function (chat) {
                chat = this.converResponseToChat(chat);
                if (!chat || chat.id <= 0) {
                    console.log("finished:", chat);
                    return;
                }
                let workingChatIndex = this.chats.findIndex(chatInArr => {
                    return chatInArr.id === chat.id;
                });
                this.chats[workingChatIndex] = chat;
            }.bind(this));
            this.endCounting();
        },
        async deleteChat(id) {
            await api.deleteChat(id);
            await this.refresh();
        },
        async recompleteChat(id) {
            await this.completeChatChunkedById(id);
        },
        async completeChat() {
            this.warn_msg = "";
            let prompt = this.prompt;
            if (!prompt || prompt.length <= 5) {
                this.warn_msg = "invalid prompt";
                this.prompt = "";
                return;
            }
            this.startCounting();
            let newChat = await api.newChat(prompt);
            this.chats = this.chats.concat(newChat);
            this.prompt = "";
            this.endCounting();
        },
        async listChats() {
            this.startCounting();
            let counts = this.$route.query.count || this.chat_count || 10;
            let chatRecords = await api.listChats(counts);
            if (chatRecords && chatRecords.length > 0) {
                this.chats = chatRecords.map(this.converResponseToChat);
            }
            this.endCounting();
        },
        converResponseToChat(record) {
            let { id, propmt, response } = { ...record };
            if (!response) {
                response = "{}";
            }
            let chat = response;
            if (typeof chat === "string") { chat = JSON.parse(chat); }
            if (!chat.choices && !chat.assistant_chunked_resposne) {
                chat.assistant_chunked_resposne = "<empty>";
            }
            chat.propmt = propmt;
            chat.id = id
            return chat
        },
        handleCopyCode(event) {
            console.log(event);
            const code = event.target.parentNode.querySelector('code');
            if (code) {
                navigator.clipboard.writeText(code.innerText);
                event.target.innerText = 'copied!';
                setTimeout(() => (event.target.innerText = 'copy'), 1000);
            }
        },
    },
};
</script>

<template>
    <div style="width: 90vw;">
        <div class="chat-list">
            <ul class="chat-list-ul" ref="codeContainer">
                <li v-for="chat in chats" :key="chat.id" class="single-chat">
                    <p class="chat-propmt">
                        <span>{{ chat.propmt }}</span>
                    <div class="action-icon-group">
                        <i class="refresh-icon action-icon" @click="recompleteChat(chat.id)">
                            <img title="Regenerate" alt="Regenerate" src="/refresh.png" />
                        </i>
                        <i class="delete-icon action-icon" @click="deleteChat(chat.id)">
                            <img title="Delete" alt="Delete" src="/delete.png" />
                        </i>
                    </div>
                    </p>
                    <p class="chat-response"
                        v-html="window._renderMD(chat.assistant_chunked_resposne || chat.choices[0].message.content, true)">
                    </p>
                </li>
            </ul>
        </div>
        <div class="new-chat" id="newChat">
            <textarea placeholder="type anything you want to start conversation with GPT-3.5" id="prompt-textarea"
                type="textarea" v-model="prompt" class="new-chat-box" />
            <p>
                <button value="chat" @click="completeChatChunked()" :disabled="loading" class="new-chat-btn">chat</button>
                <a style="margin-left: 20px;" href="/?count=2">Latest 2 chats</a>
                <a style="margin-left: 20px;" href="/?count=200">All chats</a>
            </p>
            <p style="min-height: 30px;">
                <span :hidden="!loading" style="color: hsla(200, 90%, 37%, 1);">waiting server response{{
                    `...${this.counting_num}s` }}
                </span>
                <span style="color: red;" :class="{ hide: !warn_msg || warn_msg.length <= 0 }">{{ warn_msg }}
                </span>
            </p>
        </div>
    </div>
</template>

<style scoped>

@media (max-width: 800px) {
    #app {
        padding: 0;
    }
}

@media (prefers-color-scheme: dark) {
    .chat-list-ul li.single-chat {
        color: #e0e0e0;
        background: #444;
    }

    .action-icon-group {
        background-color: #fff;
    }

    .single-chat:hover .action-icon {
        background-color: #f8f8f8;
    }

    .single-chat:hover .action-icon:hover {
        background-color: #cdcdcd;
    }

    .single-chat:hover .action-icon:active {
        background-color: #aaa;
    }

    p.chat-propmt {
        background-color: #222;
        box-shadow: #111 0 5px 5px;
        color: #fff;
    }

    .chat-list-ul li.single-chat .chat-response {
        background-color: #666;
        color: white;
    }

    .new-chat .new-chat-box {
        background-color: #ddd;
    }
}
</style>
