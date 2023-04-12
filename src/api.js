import axios from 'axios';

const client = axios.create({
    baseURL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8081/api',
    json: true
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
        })
    },
    listChats(chat_count = 5) {
        return this.execute('get', `/chats?size=${chat_count}`)
    },
    listChat(id) {
        return this.execute('get', `/chats/${id}`)
    },
    newChat(propmt, refer_previous = false) {
        return this.execute('post', '/newChat', { propmt: propmt, refer_previous: refer_previous });
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
    completeDialogue(data, max_messages = 20) {
        //for existing dialogue: {id:123, messages:[{role:'user', content:'how are you'},{role:'assistant',content:'Hi, Iam ChatGPT!'}]}
        //for new dialogue: {messages:[{role:'user', content:'how are you'}]}
        data.max_messages = max_messages;
        return this.execute('post', '/dialogues', data);
    },
    async completeChunkedDialogue(data, callback) {
        let baseURL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8081/api'
        const response = await fetch(`${baseURL}/chunked/dialogues`, {
            method: "post",
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
                        console.log("new arriving data:", chunk_index++, data);
                        await callback(data);
                    }
                }
            } catch (err) {
                console.error("unable to handle chunk:\n", chunk, err);
            }
        }
    }
}