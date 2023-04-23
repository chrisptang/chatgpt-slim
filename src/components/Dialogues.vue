<script>
import api from "@/api";

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
        isMobile() {
            return window.screen.width <= 1024;
        },
        async startCounting() {
            if (this.loading) {
                return;
            }
            this.loading = true;
            this.counting_timeout = setInterval(function () { this.counting_num++; }.bind(this), 1000);
        },
        async endCounting() {
            if (!this.loading) {
                return;
            }
            if (this.counting_timeout > 0) {
                this.counting_num = 0;
                window.clearInterval(this.counting_timeout);
            }
            this.loading = false;
        },
        async completeChunkedDialogue() {
            this.warn_msg = "";
            let prompt = this.prompt;
            if (!prompt || prompt.length <= 5) {
                this.warn_msg = "invalid prompt";
                this.prompt = "";
                return;
            }
            this.startCounting();
            if (this.working_dialogue_id == 0) {
                //create new one
                let newDialogue = this.converDialogue(await api.createDialogue(prompt));
                this.dialogues = [newDialogue, ...this.dialogues];
                this.switchDialogue(newDialogue.id);
            } else {
                //append to exist one.
                //todo:
                let newDialogue = this.converDialogue(await api.updateDialogue({ prompt, id: this.working_dialogue_id }));
                if (newDialogue.messages && newDialogue.messages.length > 0) {
                    this.working_dialogue.messages[this.working_dialogue.messages.length] = newDialogue.messages[newDialogue.messages.length - 1];
                } else {
                    window.showMessage("unable to append to existing dialogue:" + this.working_dialogue_id);
                }
            }
            this.prompt = "";
            await this.completeChunkedSingleDialogue(this.working_dialogue_id);
            this.endCounting();
        },
        async completeChunkedSingleDialogue(id) {
            this.startCounting();
            await api.completeChunkedDialogue({ id }, async function (dialogue) {
                if (!dialogue || dialogue.id <= 0) {
                    console.log("finished:", dialogue);
                    return;
                }
                this.working_dialogue = dialogue;
                for (let index in this.dialogues) {
                    if (this.dialogues[index].id == dialogue.id) {
                        this.dialogues[index] = dialogue;
                        break;
                    }
                }
                this.working_dialogue_id = dialogue.id;
            }.bind(this));
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
            this.startCounting();
            let records = await api.listDialogues(20);
            this.endCounting();
            if (records && records.length > 0) {
                this.dialogues = records.map(this.converDialogue);
                if (this.working_dialogue_id <= 0) {
                    this.switchDialogue(this.working_dialogue.id);
                }
            }
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
        async deleteDialogue(id) {
            await api.deleteDialogue(id);
            await this.listDialogues();
            await this.switchDialogue(0);
        },
        converDialogue(record) {
            if (!record) {
                return record;
            }
            if (typeof record.messages === 'string') {
                record.messages = JSON.parse(record.messages);
            }
            console.log("record.messages:", typeof record.messages);
            return record;
        }
    },
};
</script>

<template>
    <div class="dialogue-container">
        <div class="dialogue-list custom-scrollbar" :hidden="isMobile()">
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
                        @keydown.enter="exitEditMode(dialogue)" />
                    <i class="delete-icon" @click="deleteDialogue(dialogue.id)">
                        <img src="/delete.png" />
                    </i>
                </p>
            </div>
        </div>
        <div class="dialogue-detail custom-scrollbar">
            <div class="chat-list single-dialogue">
                <div class="action-icon-group">
                    <i class="refresh-icon action-icon" @click="completeChunkedSingleDialogue(working_dialogue.id)">
                        <img title="Regenerate" alt="Regenerate" src="/refresh.png" />
                    </i>
                </div>
                <ul class="chat-list-ul">
                    <li v-for="(message, index) in working_dialogue.messages" :key="message.content + index"
                        class="single-chat">
                        <p :class="message.role == 'user' ? 'chat-propmt' : 'chat-response'"
                            v-html="message.role == 'user' ? message.content : window._renderMD(message.content)">
                        </p>
                    </li>
                </ul>
            </div>
            <div class="new-chat">
                <textarea placeholder="type anything you want to start conversation with GPT-3.5" id="prompt-textarea"
                    type="textarea" v-model="prompt" class="new-chat-box" />
                <p>
                    <button value="chat" @click="completeChunkedDialogue()" :disabled="loading"
                        class="new-chat-btn">chat</button>
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

.single-dialogue:hover .action-icon {
    display: inline-block;
    z-index: 1000;
}

.single-dialogue:hover .action-icon-group {
    bottom: 0px;
    box-shadow: hsla(200, 100%, 90%, 1) 2px 5px 5px;
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

.delete-icon {
    padding-left: 20px;
    display: none;
}

.delete-icon img {
    width: 20px;
    object-fit: contain;
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

.dialogue-title:hover p.chat-propmt i.delete-icon {
    display: inline;
    position: absolute;
    right: calc(var(--section-gap) / 20);
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

@media (min-width: 1024px) {

    .greetings h1,
    .greetings h3 {
        text-align: left;
    }

    .dialogue-list {
        width: 300px;
        height: 90vh;
        padding-right: 10px;
    }

    .dialogue-detail {
        width: calc(100% - 100px);
        height: 90vh;
        margin-left: 10px;
    }

    .dialogue-detail,
    .dialogue-list {
        overflow-y: hidden;
    }

    .dialogue-detail:hover,
    .dialogue-list:hover {
        overflow-y: auto;
    }

    .dialogue-container {
        width: calc(100vw - 90px);
        max-width: 1680px;
    }

    .custom-scrollbar::-webkit-scrollbar {
        width: 2px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #ccc;
        border-radius: 10px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: #999;
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
