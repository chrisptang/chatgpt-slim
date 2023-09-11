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
        async chatToDialogue(id) {
            this.startCounting();
            let newDialogue = await api.chatToDialogue(id);
            console.log("newDialogue:", newDialogue)
            this.endCounting();
            window.location.href = `/dialogues?id=${newDialogue.id}`
        },
        converResponseToChat(record) {
            let { id, propmt, response } = { ...record };
            if (!response) {
                response = "{}";
            }
            let chat = response;
            if (typeof chat === "string") { chat = JSON.parse(chat); }
            if (!chat.choices && !chat.assistant_chunked_response) {
                chat.assistant_chunked_response = "<empty>";
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
        breakLineOrChat(event) {
            this.prompt += '\n';
        },
        handleKeyDown(event) {
            console.log('Enter + Shift is pressed');
            if (event.shiftKey) {
                event.preventDefault(); // Prevents form submission
                const textarea = event.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const currentValue = textarea.value;
                textarea.value = currentValue.substring(0, start)
                    + '\n'
                    + currentValue.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 1;
            } else {
                this.completeChatChunked()
            }
        }
    },
};
</script>

<template>
    <div class="chat-list-container">
        <div class="chat-list">
            <ul class="chat-list-ul" ref="codeContainer">
                <li v-for="chat in chats" :key="chat.id" class="single-chat">
                    <p class="chat-propmt">
                        <span>{{ chat.propmt }}</span>
                    <div class="action-icon-group">
                        <i class="refresh-icon action-icon" @click="recompleteChat(chat.id)">
                            <img title="Regenerate" alt="Regenerate" src="/refresh.png" />
                        </i>
                        <i class="to-dialogue-icon action-icon" @click="chatToDialogue(chat.id)">
                            <img title="To dialogue" alt="To dialogue" src="/chat-box.png" />
                        </i>
                        <i class="delete-icon action-icon" @click="deleteChat(chat.id)">
                            <img title="Delete" alt="Delete" src="/delete.png" />
                        </i>
                    </div>
                    </p>
                    <p class="chat-response"
                        v-html="window._renderMD(chat.assistant_chunked_response || chat.choices[0].message.content, true)">
                    </p>
                </li>
            </ul>
        </div>
        <div class="new-chat" id="newChat">
            <textarea placeholder="ask GPT-3.5 anything" id="prompt-textarea"
                @keydown.enter.exact.prevent="completeChatChunked" type="textarea" v-model="prompt" class="new-chat-box" />
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
#prompt-textarea {
    box-shadow: 0 0 5px 0 rgba(0, 0, 0, 0.3);
    border-color: #cdcdcd;
}

.chat-list-container p.chat-propmt {
    margin-bottom: 12px;
    box-shadow: none;
}

.chat-list-ul li.single-chat {
    border-radius: 5px;
    border: #e0e0e0 solid 1px;
    padding: 0.5rem 0.5vw;
    box-shadow: 0 0 5px 0 rgba(0, 0, 0, 0.3);
}

@media (max-width: 800px) {
    #app {
        padding: 0;
    }
}

@media (prefers-color-scheme: dark) {

    .single-chat:hover .action-icon {
        background-color: #f8f8f8;
    }

    .single-chat:hover .action-icon:hover {
        background-color: #cdcdcd;
    }

    .single-chat:hover .action-icon:active {
        background-color: #aaa;
    }
}
</style>
