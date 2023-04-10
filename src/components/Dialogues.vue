<script>
import api from "@/api";
import { useRoute } from "vue-router";

const new_dialogue_obj = JSON.stringify({
    title: "Dialogue with ChatGPT-3.5",
    id: 0,
    messages: [{
        "role": "user",
        "content": "Type anything to start dialogue"
    }, {
        "role": "assistant",
        "content": "ChatGPT will resposne here."
    }]
});

export default {
    name: "ChatList",
    data() {
        return {
            warn_msg: "",
            working_dialogue_id: 0,
            counting_num: 1,
            counting_timeout: null,
            refer_previous: false,
            dialogues: [JSON.parse(new_dialogue_obj)],
            working_dialogue: JSON.parse(new_dialogue_obj),
            prompt: "",
            size: 10,
            loading: false,
            editMode: [],
            newTitle: '',
        };
    },
    async created() {
        this.refresh();
    },
    methods: {
        async refresh() {
            await this.listDialogues();
        },
        async startCounting() {
            this.counting_timeout = setInterval(function () { this.counting_num++; }.bind(this), 1000);
        },
        async endCounting() {
            if (this.counting_timeout > 0) {
                window.clearInterval(this.counting_timeout);
            }
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
            this.startCounting();
            let data = { id: this.working_dialogue.id, messages: [{ role: "user", content: prompt }] };
            this.working_dialogue.messages = this.working_dialogue.messages.concat(data.messages[0]);
            let dialogue = await api.completeDialogue(data);
            this.working_dialogue = dialogue;
            this.loading = false;
            this.prompt = "";
            this.endCounting();
        },
        async switchDialogue(id) {
            this.working_dialogue_id = id;
            if (id == 0) {
                this.working_dialogue = JSON.parse(new_dialogue_obj);
                return;
            }
            this.working_dialogue = this.dialogues.filter(d => { return d.id == id })[0];
            console.log("switched to:", id, this.working_dialogue);
        },
        async listDialogues() {
            this.loading = true;
            // let size = useRoute().query.size || this.size || 10;
            this.startCounting();
            let records = await api.listDialogues(20);
            this.endCounting();
            if (records && records.length > 0) {
                this.dialogues = records.map(record => {
                    record.messages = JSON.parse(record.messages);
                    return record;
                });
                if (this.working_dialogue_id <= 0) {
                    this.switchDialogue(this.working_dialogue.id);
                }
            }
            this.loading = false;
        },
        enterEditMode(id) {
            this.editMode[id] = true;
        },
        async exitEditMode(dialogue, $event) {
            this.editMode[dialogue.id] = false;
            console.log("about to update:", $event, dialogue);
            await api.updateDialogue(dialogue);
            await this.listDialogues();
        },
    },
};
</script>

<template>
    <div class="dialogue-container">
        <div class="dialogue-list">
            <div @click="switchDialogue(0)" class="dialogue-title"
                :class="working_dialogue_id == 0 ? 'dialogue-title selected-dialogue' : 'dialogue-title'">
                <p class="chat-propmt">New Dialogue</p>
            </div>
            <div v-for="dialogue in dialogues" :key="dialogue.id" @dblclick="enterEditMode(dialogue.id)"
                @click="switchDialogue(dialogue.id)" class="dialogue-title"
                :class="working_dialogue_id == dialogue.id ? 'dialogue-title selected-dialogue' : 'dialogue-title'">
                <p class="chat-propmt">
                    <span v-if="!editMode[dialogue.id]">{{ dialogue.title }}</span>
                    <input v-else type="text" v-model="dialogue.title" @blur="exitEditMode(dialogue, $event)"
                        @keydown.enter="exitEditMode(dialogue)">
                </p>
            </div>
        </div>
        <div class="dialogue-detail">
            <div class="chat-list">
                <ul class="chat-list-ul">
                    <li v-for="message in working_dialogue.messages" :key="message.content" class="single-chat">
                        <p :class="message.role == 'user' ? 'chat-propmt' : 'chat-response'"
                            v-html="message.role == 'user' ? message.content : window.markdownit().render(message.content)">
                        </p>
                    </li>
                </ul>
            </div>
            <div class="new-chat">
                <textarea placeholder="type anything you want to start conversation with GPT-3.5" id="prompt-textarea"
                    type="textarea" v-model="prompt" class="new-chat-box" />
                <p>
                    <button value="chat" @click="completeChat()" :disabled="loading" class="new-chat-btn">chat</button>
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
    margin-bottom: 20px;
}

.chat-list-ul li.single-chat .chat-response {
    background-color: ghostwhite;
}

h3 {
    font-size: 1.2rem;
}

p.chat-response {
    overflow-wrap: anywhere;
    padding: 5px 10px;
    margin-left: 20px;
}

.dialogue-title.selected-dialogue .chat-propmt {
    color: aliceblue;
    font-weight: bolder;
    background-color: hsla(200, 100%, 50%, 1);
}

.dialogue-title.selected-dialogue .chat-propmt span {
    font-weight: bolder;
}

p.chat-response,
p.chat-propmt {
    border-radius: 5px;
}

.dialogue-container {
    display: flex;
}

code {
    white-space: break-spaces;
}

p.chat-propmt {
    white-space: pre-wrap;
    background-color: hsla(200, 100%, 90%, 1);
    box-shadow: hsla(200, 100%, 90%, 1) 0 5px 20px;
    margin-bottom: 10px;
    padding: 5px 10px;
    margin-right: 20px;
}

.dialogue-title p.chat-propmt {
    background-color: hsla(200, 100%, 75%, 1);
}

.dialogue-title {
    cursor: pointer;
}

.dialogue-title:hover p.chat-propmt {
    background-color: hsla(200, 100%, 65%, 1);
}

.greetings h1 {
    text-align: center;
    padding-top: 20px;
}

.new-chat .new-chat-box {
    padding: 10px;
    width: 100%;
    max-width: 100vw;
    max-height: 300px;
    min-height: 50px;
    border-radius: 5px;
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

@media (max-width: 900px) {
    main {
        width: 98vw;
    }
}

@media (min-width: 1024px) {

    .greetings h1,
    .greetings h3 {
        text-align: left;
    }

    .dialogue-list {
        width: 300px;
    }

    .dialogue-detail {
        /* margin-left: 20px; */
        /* width: 100%; */
        width: calc(100% - 360px);
        min-height: 98vh;
    }

    .dialogue-container {
        width: 100vw;
        max-width: 1280px;
    }
}

@media (prefers-color-scheme: dark) {
    .chat-list-ul li.single-chat {
        color: #e0e0e0;
        background: #444;
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

    .dialogue-title.selected-dialogue .chat-propmt {
        background-color: #222;
        box-shadow: #111 0 5px 5px;
        color: #fff;
    }

    .dialogue-title p.chat-propmt {
        background-color: #555;
    }

    .dialogue-title:hover p.chat-propmt {
        background-color: #777;
    }
}
</style>
