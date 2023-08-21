import axios from 'axios';

const client = axios.create({
    baseURL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8081/api',
    json: true,
    withCredentials: true
})

const decoder = new TextDecoder('utf-8');

export default {
    async execute(method, resource, data) {
        // inject the accessToken for each request
        return client({
            method,
            url: resource,
            data
        }).then(req => {
            return req.data;
        }).catch(err => {
            console.error(err);
            if (err.response && err.response.status === 401 && err.response.data) {
                window.showMessage("Log you in with github...");
                setTimeout(() => {
                    window.location.href = err.response.data.login;
                }, 3500);
                return {};
            }
            window.showMessage("server error:" + err.message);
            return {};
        })
    },
    listConfigs() {
        return this.execute('get', "/config")
    },
    updateConfig(config_name, config_value) {
        return this.execute('post', `/config/${config_name}?value=${config_value}`)
    },
    listUserInfo() {
        return this.execute('get', "/me")
    },
    listUsers(size = 50) {
        return this.execute('get', `/users?size=${size}`)
    },
    enableUserOrAdmin(id = 0, enable = false, admin = false) {
        return this.execute('post', `/users/${id}`, { enable, is_admin: admin })
    },
    listChats(chat_count = 5) {
        return this.execute('get', `/chats?size=${chat_count}`)
    },
    listChat(id) {
        return this.execute('get', `/chats/${id}`)
    },
    deleteChat(id) {
        return this.execute('delete', `/chats/${id}`)
    },
    newChat(propmt, refer_previous = false) {
        return this.execute('post', '/newChat', { propmt: propmt, refer_previous: refer_previous });
    },

    // just insert a record of chat:
    createChat(propmt) {
        return this.execute('post', '/chats', { propmt });
    },
    listDialogues(size = 5) {
        return this.execute('get', `/dialogues?size=${size}`)
    },
    listDialogue(id) {
        return this.execute('get', `/dialogues/${id}`)
    },
    deleteDialogue(id) {
        return this.execute('delete', `/dialogues/${id}`)
    },
    updateDialogue(dialogue) {
        return this.execute('post', `/dialogues/${dialogue.id}`, dialogue)
    },
    renameDialogueWithGPT(id) {
        return this.execute('post', `/dialogues/${id}/rename`)
    },
    createDialogue(propmt) {
        //for existing dialogue: {id:123, messages:[{role:'user', content:'how are you'},{role:'assistant',content:'Hi, Iam ChatGPT!'}]}
        //for new dialogue: {messages:[{role:'user', content:'how are you'}]}
        return this.execute('post', '/dialogues', { propmt });
    },
    async completeChunkedDialogue(data, callback) {
        await this.chunkedApi("chunked/dialogues", data, callback);
    },
    async completeChatChunked(id, data, callback) {
        await this.chunkedApi(`chats/${id}`, data, callback);
    },
    async chunkedApi(path, data, callback) {
        let baseURL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8081/api'
        const response = await fetch(`${baseURL}/${path}`, {
            method: "post",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        const reader = response.body.getReader();

        let chunk_index = 0

        while (true) {
            const { value, done } = await reader.read();

            if (done) {
                return true;
            }
            let chunk = decoder.decode(value);
            try {
                if (chunk.startsWith("data: ")) {
                    let datas = chunk.split("data: ").filter(data => {
                        return data.trim().length > 8;
                    }).map(data => {
                        return JSON.parse(data.trim());
                    });

                    for (let data of datas) {
                        if (++chunk_index % 50 == 0) {
                            console.log("new arriving data:", chunk_index, data);
                        }
                        await callback(data);
                    }
                }
            } catch (err) {
                console.error("unable to handle chunk:\n", chunk, err);
            }
        }
    }
}