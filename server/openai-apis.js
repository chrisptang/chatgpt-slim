import express from 'express';
import cors from 'cors';
import path from "path";
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { Chats, Dialogues, sync_database } from "./database-models.js"
import { setupLoginWithGithub, AUTH_ALLOWED_PATHS } from "./user-operations.js"
import { getConfig } from "./config-operations.js"
import { setUpSysConfig } from './config-operations.js'
import { createServer } from 'http';
import HttpsProxyAgent from "https-proxy-agent";

console.log("starting with env:", process.env)

let app = express();
const ALLOWED_DOMAINS = ['http://localhost:5001', 'http://127.0.0.1:5001'];
app.use(cors({
    origin: ALLOWED_DOMAINS,
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const static_path = process.env.SERVER_STATIC_PATH || '../dist';
app.use(express.static(static_path))
setupLoginWithGithub(app)
setUpSysConfig(app);

const DEFAUL_OPENAI_MODEL = process.env.DEFAUL_OPENAI_MODEL || "gpt-3.5-turbo-0301";

console.log("about to start new chatgpt server with key:", (process.env.OPENAI_API_KEY || "0000000000").substring(0, 10));

function use_proxy_or_not(postJson, config) {
    if ("true" === config.USE_PROXY && config.HTTP_PROXY) {
        postJson.agent = new HttpsProxyAgent(config.HTTP_PROXY || process.env.HTTP_PROXY);
        console.log("using proxy:", postJson.agent);
    }

    return postJson;
}

async function make_azure_openai_request(path, data) {
    let config = await getConfig();
    console.log("calling azure openai apis with config:", JSON.stringify(config));
    const headers = {
        "api-key": `${config.AZURE_API_KEY || process.env.AZURE_API_KEY}`,
        "Content-Type": "application/json",
    };
    const postJson = { headers }
    use_proxy_or_not(postJson, config);
    //https://chrisptang-au-gpt.openai.azure.com/openai/deployments/chrisptang-gpt-35-turbo-16k/chat/completions?api-version=2023-05-15
    let url = `https://${config.AZURE_RESOURCE_NAME}.openai.azure.com/openai/deployments/${config.AZURE_DEPLOYMENT_NAME}/${path}?api-version=${config.AZURE_API_VERSION}`
    console.log("making request to:", url)
    if (data) {
        //POST as json
        postJson.method = "POST";
        postJson.body = JSON.stringify(data);
    }
    try {
        let resposne = await fetch(url, postJson);
        if (data && data.stream) {
            return resposne;
        }
        if (resposne.status != 200) {
            let text = await resposne.text();
            console.error("error code:", resposne.status, text);
            return { error: true, code: resposne.status, body: text };
        }
        return await resposne.json();
    } catch (err) {
        console.error("request error:", err.message, "data:", data);
        return { error: true, message: err.message };
    }
}

async function make_openai_request(path, data) {
    let config = await getConfig();
    if ("true" === config.USE_AZURE) {
        return await make_azure_openai_request(path, data);
    }
    console.log("calling openai apis with config:", JSON.stringify(config));
    const headers = {
        "Authorization": `Bearer ${config.OPENAI_API_KEY || process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
    };
    const postJson = { headers }
    use_proxy_or_not(postJson, config);
    let url = `https://api.openai.com/v1/${path}`
    console.log("making request to:", url)
    if (data) {
        //POST as json
        postJson.method = "POST";
        postJson.body = JSON.stringify(data);
    }
    try {
        let resposne = await fetch(url, postJson);
        if (data && data.stream) {
            return resposne;
        }
        if (resposne.status != 200) {
            let text = await resposne.text();
            console.error("error code:", resposne.status, text);
            return { error: true, code: resposne.status, body: text };
        }
        return await resposne.json();
    } catch (err) {
        console.error("request error:", err.message, "data:", data);
        return { error: true, message: err.message };
    }
}

const server = createServer(app);

async function getLatestChatRecords(user, max_previous = 5, order = "DESC") {
    if (max_previous <= 0) {
        return [];
    }
    try {
        const latestRecords = await Chats.findAll({
            order: [['create_time', order]],
            limit: max_previous,
            where: { user }
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

app.get('/api/chats', async (req, res) => {
    let size = req.query.size || 10;
    let user = req.user.login;
    console.log("chats:", user);
    let records = await getLatestChatRecords(user, size);
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
        create_time: new Date(),
        user: req.user.login
    });

    res.json(record)
});

app.get('/api/chats/:id', async (req, res) => {
    let id = req.params.id
    let record = await Chats.findOne({ where: { id, user: req.user.login } })
    res.json(record);
});

app.delete('/api/chats/:id', async (req, res) => {
    let id = req.params.id
    let record = await Chats.findOne({ where: { id, user: req.user.login } })
    if (record) {
        await record.destroy();
    }
    res.json({ deleted: true });
});

const chunk_header = {
    'Content-Type': 'application/json',
    'Transfer-Encoding': 'chunked',
    'Access-Control-Allow-Origin': ALLOWED_DOMAINS[0],
    'Access-Control-Allow-Credentials': true,
};

async function processChunkedResponse(response, callback) {
    let chunk_index = 0;
    let chunk_real = '', assistant_chunked_response = '';
    for await (let chunkOfBody of response.body) {
        chunk_index++;
        let chunk = chunkOfBody.toString().trim();
        chunk_real += chunk;


        if (!chunk.endsWith("}") && !chunk.endsWith('[DONE]')) {
            //说明不是JSON结尾
            console.warn(`${chunk_index}:不是JSON结尾:${chunk_real}`);
            continue;
        }

        if (chunk_real.startsWith("data: ")) {
            let datas = chunk_real.split("data: ").filter(data => {
                return data.trim().length > 8;
            }).map(data => {
                try {
                    return JSON.parse(data.trim());
                } catch (err) {
                    // console.error("chunk:", chunk, err.message, err.stack);
                    return {};
                }
            });

            for (let data of datas) {
                if (!data || !data.choices) {
                    continue;
                }
                let delta = { ...data.choices[0].delta };
                if (delta && delta.content) {
                    assistant_chunked_response += delta.content;
                    // callback(assistant_chunked_response);
                }
            }
            callback(assistant_chunked_response);
            chunk_real = '';
        }
    }
}

//complete this chat:
app.post('/api/chats/:id', async (req, res) => {
    let id = req.params.id, user = req.user.login;
    let propmt = req.body.propmt;//
    let record = await Chats.findOne({ where: { id, user } })
    if (!record) {
        res.status(404);
        res.end();
        return;
    }
    propmt = propmt || record.propmt;

    let config = await getConfig();
    console.log("calling openai apis with config:", JSON.stringify(config));
    let model = req.body.model || config.DEFAUL_OPENAI_MODEL || DEFAUL_OPENAI_MODEL;
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
    try {
        let assistant_chunked_response = '';
        await processChunkedResponse(response, function (new_chunk) {
            record.response = { assistant_chunked_response: new_chunk }
            assistant_chunked_response = new_chunk;
            res.write("data: " + JSON.stringify(record));
        });

        let updateRecord = { response: JSON.stringify({ assistant_chunked_response }) };
        await Chats.update(updateRecord, { where: { id } });
        record = await Chats.findOne({ where: { id, user } });
        record.response = JSON.parse(record.response);
        res.write("data: " + JSON.stringify(record));
        res.end();
    } catch (err) {
        console.error(err.message, err.stack);
    }
});

app.get('/api/dialogues', async (req, res) => {
    let size = req.query.size || 10, order = req.query.order || "DESC";
    let user = req.user.login;
    let latestRecords = await Dialogues.findAll({
        order: [['id', order]],
        limit: size,
        where: { user }
    });
    res.json(latestRecords);

});

app.get('/api/dialogues/:id', async (req, res) => {
    let id = req.params.id;
    let user = req.user.login;
    let record = await Dialogues.findOne({ where: { id, user } })
    res.json(record);
});


app.delete('/api/dialogues/:id', async (req, res) => {
    let id = req.params.id;
    let user = req.user.login;
    let record = await Dialogues.findOne({ where: { id, user } });
    if (record) {
        await record.destroy();
    }

    res.json({ deleted: id });
});

//rename dialogue with response from GPT
app.post('/api/dialogues/:id/rename', async (req, res) => {
    let id = req.params.id
    let user = req.user.login;
    let record = await Dialogues.findOne({ where: { id, user } });
    if (!record) {
        res.status = 404;
        res.end();
        return;
    }
    console.log("renaming dialogue with GPT:", id);

    let messages = JSON.parse(record.messages).concat({ role: "user", content: "name our conversation within 10 words" });

    let model = req.body.model || DEFAUL_OPENAI_MODEL,
        data = {
            model: model,
            messages
        }

    data.stream = false;

    const response = await make_openai_request("chat/completions", data);
    if (!response || response.error) {
        res.status(response.code);
        res.json(response);
        return;
    }
    let title = response.choices[0].message.content;
    title = title.replace(/^"|"$/g, '');
    let updateRecord = { title };
    console.log("updateRecord", updateRecord, "response:", response);
    if (updateRecord.title && updateRecord.title.length > 0) {
        await Dialogues.update(updateRecord, { where: { id } });
        record = await Dialogues.findOne({ where: { id } })
    }
    res.json(record);
});

//update dialogue, typical for title renaming.
app.post('/api/dialogues/:id', async (req, res) => {
    let id = req.params.id
    let user = req.user.login;
    let record = await Dialogues.findOne({ where: { id, user } });
    if (!record) {
        res.status = 404;
        res.end();
        return;
    }
    let { prompt, title, messages } = { ...req.body };
    console.log("updating dialogue:", prompt, title);
    let updateRecord = {};
    if (title && title.length > 2) {
        updateRecord.title = title;
    }
    if (prompt && prompt.length > 2) {
        //{"prompt":"what time did it reach a population of 10000000?","id":24}
        updateRecord.messages = JSON.stringify(JSON.parse(record.messages).concat({ role: "user", content: prompt }));
    }
    if (messages && messages.length > 0) {
        //update whole message list
        updateRecord.messages = JSON.stringify(messages);
    }

    console.log("updateRecord", updateRecord);
    if (Object.keys(updateRecord).length > 0) {
        await Dialogues.update(updateRecord, { where: { id } });
        record = await Dialogues.findOne({ where: { id } })
    }
    res.json(record);
});

// create new user content to let server response.
app.post('/api/dialogues', async (req, res) => {
    let propmt = req.body.propmt, user = req.user.login;

    console.log(req.body);
    if (!propmt || propmt.length == 0) {
        res.status(400);
        res.write("invalid request body:" + JSON.stringify(req.body));
        res.end();
        return null;
    }

    let messages = [{ role: 'user', content: propmt }];

    console.log("about to start new dialogue:", messages);
    let record = { user, title: "Dialogue at " + new Date().toLocaleString(), messages: JSON.stringify(messages) };
    record = await Dialogues.create(record);
    console.log("new dialogue:", record);

    res.json(record);
});


// request openai api in steaming mode
app.post('/api/chunked/dialogues', async (req, res) => {
    //for existing dialogue: {id:123, messages:[{role:'user', content:'how are you'},{role:'assistant',content:'Hi, Iam ChatGPT!'}]}
    //for new dialogue: {messages:[{role:'user', content:'how are you'}]}
    let id = req.body.id || 0, user = req.user.login;
    console.log(req.body);

    console.log("about to complete dialogue:", id);

    let record = await Dialogues.findOne({ where: { id, user } });

    if (!record || !record.messages || record.messages.length < 10) {
        res.status(404);
        res.write("invalid request body:" + JSON.stringify(req.body));
        res.end();
        return null;
    }

    let model = req.body.model || DEFAUL_OPENAI_MODEL,
        messages = JSON.parse(record.messages);
    let data = {
        model: model,
        messages
    }

    data.stream = true;
    res.header(chunk_header);

    const response = await make_openai_request("chat/completions", data);
    let chunk_message = { role: "assistant", content: "" };
    messages = messages.concat(chunk_message);

    try {
        await processChunkedResponse(response, function (new_chunk) {
            chunk_message.content = new_chunk;
            record.messages = messages;
            res.write("data: " + JSON.stringify({ id, messageIndex: messages.length - 1, role: "assistant", content: new_chunk }));
        });
        let updateRecord = { messages: JSON.stringify(messages) };
        await Dialogues.update(updateRecord, { where: { id } });
        record = await Dialogues.findOne({ where: { id } });
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
        if (!res.headersSent) {
            res.status(500).send(JSON.stringify({ error: true }));
        }
        res.end();
    } else if (!req.url.match(AUTH_ALLOWED_PATHS) && !req.url.startsWith("/auth/")) {
        // fullback to /home
        res.sendFile(path.join(static_path, 'index.html'));
    }
});

app.use((err, req, res, next) => {
    console.error("handle request failed:", req.url, err.message, err.stack);
    if (!res.headersSent) {
        res.status(500).send(JSON.stringify({ error: true, message: err.message }));
    }
});

sync_database(async () => {
    app.listen(port, () => {
        console.log(`listening to port localhost:${port}`)
    });
});