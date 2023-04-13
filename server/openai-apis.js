import express from 'express';
import cors from 'cors';
import path from "path";
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { Chats, Dialogues, sync_database } from "./database-models.js"
import { createServer } from 'http';
import HttpsProxyAgent from "https-proxy-agent";

let app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const static_path = process.env.SERVER_STATIC_PATH || '../dist';
app.use(express.static(static_path))

const DEFAUL_OPEN_AI_MODEL = "gpt-3.5-turbo-0301";

console.log("about to start new chatgpt server with key:", (process.env.OPENAI_API_KEY || "0000000000").substring(0, 10));

async function make_openai_request(path, data) {
    const headers = {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
    };
    const postJson = { headers }
    if (process.env.HTTP_PROXY) {
        postJson.agent = new HttpsProxyAgent(process.env.HTTP_PROXY);
        console.log("using proxy:", postJson.agent);
    }
    let url = `https://api.openai.com/v1/${path}`
    console.log("making request to:", url)
    if (data) {
        //POST as json
        postJson.method = "POST";
        postJson.body = JSON.stringify(data);
    }
    let resposne = await fetch(url, postJson);
    if (data && data.stream) {
        return resposne;
    }
    if (resposne.status != 200) {
        console.error("error code:", resposne.status, await resposne.text());
        return {};
    }
    return await resposne.json();
}

let test = await make_openai_request("models")
console.log("available openai models:", test.data.map(model => {
    let { id, owned_by, created } = { ...model };
    created = new Date(created * 1000).toISOString().split(".")[0];
    return { id, owned_by, created };
}));

const server = createServer(app);

async function getLatestChatRecords(max_previous = 5, order = "DESC") {
    if (max_previous <= 0) {
        return [];
    }
    try {
        const latestRecords = await Chats.findAll({
            order: [['create_time', order]],
            limit: max_previous
        });
        return latestRecords;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function randomSeqId() {
    return parseInt(new Date().getTime() + "" + Math.floor(Math.random() * 999 + 1000));
}

app.post('/api/newChat', async (req, res) => {
    let model = req.body.model || DEFAUL_OPEN_AI_MODEL;
    let propmt = req.body.propmt;
    let refer_previous = req.body.refer_previous || false;
    let max_previous = req.body.max_previous || 5;
    if (!propmt || propmt.length <= 5) {
        console.warn("invalid propmt:", propmt);
        res.status = 400;
        res.write("invalid propmt:" + propmt);
        res.end();
        return;
    }

    let data = {
        model: model,
        messages: [{ role: "user", content: propmt }]
    }
    if (refer_previous) {
        await appendPreviousChat(data, max_previous);
        console.log("added previous chats:", data);
    }
    console.log("starting chat with:", data);
    const completion = await make_openai_request("chat/completions", data);
    if (!completion || !completion.choices || completion.choices.length <= 0) {
        console.warn("invalid response from openai:", completion, "\nrequest:", data);
        res.status = 500;
        res.end();
        return;
    }
    let completionStr = JSON.stringify(completion, null, 4);
    console.log(completionStr);
    let dbItem = {
        ref_id: randomSeqId(),
        propmt: propmt,
        response: completionStr,
        create_time: new Date()
    };
    await Chats.create(dbItem);
    completion.propmt = propmt;
    res.json(completion)
});

async function appendPreviousChat(data, max_previous = 5) {
    let records = await getLatestChatRecords(max_previous);
    console.log("refering records:", records);
    if (records && records.length > 0) {
        records.forEach(chat => {
            data.messages = data.messages.concat(JSON.parse(chat.response).choices[0].message);
            data.messages = data.messages.concat({ role: "user", content: chat.propmt });
            return 0;
        });
        data.messages = data.messages.reverse();
        console.log("data.messages:", data.messages, "\nrecords:", records);
    }
}

app.get('/api/chats', async (req, res) => {
    let size = req.query.size || 10;
    let records = await getLatestChatRecords(size);
    if (records && records.length > 1) {
        records = records.reverse();
    }
    res.json(records);
});

app.post('/api/chats', async (req, res) => {
    let propmt = req.body.propmt;
    if (!propmt) {
        res.json({ error: true, msg: `invalid ${propmt}` });
        return
    }
    let record = await Chats.create({
        ref_id: randomSeqId(),
        propmt: propmt,
        response: "",
        create_time: new Date()
    });

    res.json(record)
});

app.get('/api/chats/:id', async (req, res) => {
    let id = req.params.id
    let record = await Chats.findOne({ where: { id: id } })
    res.json(record);
});

app.delete('/api/chats/:id', async (req, res) => {
    let id = req.params.id
    let record = await Chats.findOne({ where: { id: id } })
    if (record) {
        await record.destroy();
    }
    res.json({ deleted: true });
});

const chunk_header = {
    'Content-Type': 'application/json',
    'Transfer-Encoding': 'chunked',
    'Access-Control-Allow-Origin': '*'
};

//complete this chat:
app.post('/api/chats/:id', async (req, res) => {
    let id = req.params.id
    let propmt = req.body.propmt;
    let record = await Chats.findOne({ where: { id: id } })
    if (!record) {
        res.status(404);
        res.end();
        return;
    }
    propmt = propmt || record.propmt;

    let model = req.body.model || DEFAUL_OPEN_AI_MODEL;
    let data = {
        model: model,
        stream: true,
        messages: [{
            role: "user",
            content: propmt
        }]
    }

    res.header(chunk_header);

    const response = await make_openai_request("chat/completions", data);
    let assistant_chunked_resposne = "";

    let chunk_index = 0;

    try {
        for await (let chunk of response.body) {
            chunk = chunk.toString()
            if (chunk_index % 20) {
                // print debugger info every 20 chunks.
                console.log("chunk:", chunk_index, "\n", chunk);
            }

            if (chunk.startsWith("data: ")) {
                let datas = chunk.split("data: ").filter(data => {
                    return data.trim().length > 8;
                }).map(data => {
                    return JSON.parse(data.trim());
                });

                for (let data of datas) {
                    let delta = { ...data.choices[0].delta };
                    if (delta && delta.content) {
                        assistant_chunked_resposne += delta.content;
                        record.response = { assistant_chunked_resposne }
                        res.write("data: " + JSON.stringify(record));
                    }
                }
            }
            chunk_index++;
        }
        let updateRecord = { response: JSON.stringify({ assistant_chunked_resposne }) };
        await Chats.update(updateRecord, { where: { id } });
        record = await Chats.findOne({ where: { id: id } });
        record.response = JSON.parse(record.response);
        res.write("data: " + JSON.stringify(record));
        res.end();
    } catch (err) {
        console.error(err.message, err.stack);
    }
});

app.get('/api/dialogues', async (req, res) => {
    let size = req.query.size || 10, order = req.query.order || "DESC";
    let latestRecords = await Dialogues.findAll({
        order: [['id', order]],
        limit: size
    });
    res.json(latestRecords);

});

app.get('/api/dialogues/:id', async (req, res) => {
    let id = req.params.id
    let record = await Dialogues.findOne({ where: { id: id } })
    res.json(record);
});


app.delete('/api/dialogues/:id', async (req, res) => {
    let id = req.params.id;
    let record = await Dialogues.findOne({ where: { id: id } });
    if (record) {
        await record.destroy();
    }

    res.json({ deleted: id });
});

//update dialogue, typical for title renaming.
app.post('/api/dialogues/:id', async (req, res) => {
    let id = req.params.id
    let record = await Dialogues.findOne({ where: { id: id } })
    if (!record) {
        res.status = 404;
        res.end();
        return;
    }
    await Dialogues.update({ title: req.body.title }, { where: { id } });
    record = await Chats.findOne({ where: { id: id } })
    res.json(record);
});

// create or append new user content to let server response.
app.post('/api/dialogues', async (req, res) => {
    //for existing dialogue: {id:123, messages:[{role:'user', content:'how are you'},{role:'assistant',content:'Hi, Iam ChatGPT!'}]}
    //for new dialogue: {messages:[{role:'user', content:'how are you'}]}
    let id = req.body.id || 0, messages = req.body.messages;

    console.log(req.body);
    if (!messages || messages.length == 0) {
        res.status(400);
        res.write("invalid request body:" + JSON.stringify(req.body));
        res.end();
        return null;
    }

    console.log("about to start new dialogue:", req.body);

    let record = await Dialogues.findOne({ where: { id: id } })

    if (record && record.id > 0) {
        messages = JSON.parse(record.messages).concat(messages[messages.length - 1]);
    } else {
        record = { title: "Dialogue at " + new Date().toISOString(), messages: JSON.stringify(messages) };
        let newDialogue = await Dialogues.create(record);
        id = newDialogue.id;
    }

    let model = req.body.model || DEFAUL_OPEN_AI_MODEL;
    let data = {
        model: model,
        messages
    }

    const completion = await make_openai_request("chat/completions", data);
    if (!completion || !completion.choices || completion.choices.length <= 0) {
        console.warn("invalid response from openai:", completion, "\nrequest:", data);
        res.status = 500;
        res.end();
        return;
    }
    let completionStr = JSON.stringify(completion, null, 4);
    console.log(completionStr);
    messages = messages.concat(completion.choices[0].message);

    let updateRecord = { messages: JSON.stringify(messages) };
    await Dialogues.update(updateRecord, { where: { id } });

    record = await Dialogues.findOne({ where: { id } })
    record.messages = JSON.parse(record.messages);
    res.json(record);
});


// request openai api in steaming mode
app.post('/api/chunked/dialogues', async (req, res) => {
    //for existing dialogue: {id:123, messages:[{role:'user', content:'how are you'},{role:'assistant',content:'Hi, Iam ChatGPT!'}]}
    //for new dialogue: {messages:[{role:'user', content:'how are you'}]}
    let id = req.body.id || 0, messages = req.body.messages;
    console.log(req.body);
    if (!messages || messages.length == 0) {
        res.status(400);
        res.write("invalid request body:" + JSON.stringify(req.body));
        res.end();
        return null;
    }

    console.log("about to start new dialogue:", req.body);

    let record = await Dialogues.findOne({ where: { id: id } });

    if (record && record.id > 0) {
        messages = JSON.parse(record.messages).concat(messages[messages.length - 1]);
    } else {
        record = { title: "Dialogue at " + new Date().toISOString(), messages: JSON.stringify(messages) };
        record = await Dialogues.create(record);
        id = record.id;
    }

    let model = req.body.model || DEFAUL_OPEN_AI_MODEL;
    let data = {
        model: model,
        messages
    }

    data.stream = true;
    let chunk_index = 0;

    res.header(chunk_header);

    const response = await make_openai_request("chat/completions", data);
    let assistant_chunked_resposne = "", chunk_message = { role: "assistant", content: "" };
    messages = messages.concat(chunk_message);

    try {
        for await (let chunk of response.body) {
            chunk = chunk.toString()
            if (chunk_index % 20) {
                // print debugger info every 20 chunks.
                console.log("chunk:", chunk_index, "\n", chunk);
            }

            if (chunk.startsWith("data: ")) {
                let datas = chunk.split("data: ").filter(data => {
                    return data.trim().length > 8;
                }).map(data => {
                    return JSON.parse(data.trim());
                });

                for (let data of datas) {
                    let delta = { ...data.choices[0].delta };
                    if (delta && delta.content) {
                        assistant_chunked_resposne += delta.content;
                        chunk_message.content = assistant_chunked_resposne;
                        record.messages = messages;
                        res.write("data: " + JSON.stringify(record));
                    }
                }
            }
            chunk_index++;
        }
        let updateRecord = { messages: JSON.stringify(messages) };
        await Dialogues.update(updateRecord, { where: { id } });
        record = await Dialogues.findOne({ where: { id: id } });
        record.messages = JSON.parse(record.messages);
        res.write("data: " + JSON.stringify(record));
        res.end();
    } catch (err) {
        console.error(err.message, err.stack);
    }
});


const port = parseInt(process.env.PORT || "8081")

//error handling
app.use((req, res) => {
    if (req.url.indexOf("/api/") > 0) {
        //send json for api calls
        res.status(500).json({ error: true });
        res.end();
    } else {
        // fullback to /home
        res.sendFile(path.join(static_path, 'index.html'));
    }
});

sync_database(() => {
    app.listen(port, () => {
        console.log(`listening to port localhost:${port}`)
    })
});