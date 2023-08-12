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
            console.error("error code:", resposne.status, await resposne.text());
            return {};
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
            console.error("error code:", resposne.status, await resposne.text());
            return {};
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

app.post('/api/newChat', async (req, res) => {
    let config = await getConfig();
    console.log("calling openai apis with config:", JSON.stringify(config));
    let model = req.body.model || config.DEFAUL_OPENAI_MODEL || DEFAUL_OPENAI_MODEL;
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
        let user = req.user.login
        await appendPreviousChat(user, data, max_previous);
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
        create_time: new Date(),
        user: req.user.login
    };
    await Chats.create(dbItem);
    completion.propmt = propmt;
    res.json(completion)
});

async function appendPreviousChat(user, data, max_previous = 5) {
    let records = await getLatestChatRecords(user, max_previous);
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
    let assistant_chunked_resposne = "";

    let chunk_index = 0;

    try {
        let chunk_real = '';
        for await (let chunkOfBody of response.body) {
            chunk_index++;
            let chunk = chunkOfBody.toString().trim();
            chunk_real += chunk;


            if (!chunk.endsWith("}") && !chunk.endsWith('[DONE]')) {
                //说明不是JSON结尾
                console.warn(`${chunk_index}:不是JSON结尾:${chunk_real}`);
                continue;
            }
            //  else {
            //     console.warn(`${chunk_index}:${chunk_real}`);
            //     chunk_real = '';
            //     continue;
            // }


            // if (++chunk_index % 30 == 0) {
            // print debugger info every 20 chunks.
            // console.log("chunk:", chunk_index, "\n", chunk);
            // }

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
                        assistant_chunked_resposne += delta.content;
                        record.response = { assistant_chunked_resposne }
                        res.write("data: " + JSON.stringify(record));
                    }
                }
                chunk_real = '';
            }
        }
        let updateRecord = { response: JSON.stringify({ assistant_chunked_resposne }) };
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
    let record = { user, title: "Dialogue at " + new Date().toISOString(), messages: JSON.stringify(messages) };
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
    let chunk_index = 0;

    res.header(chunk_header);

    const response = await make_openai_request("chat/completions", data);
    let assistant_chunked_resposne = "", chunk_message = { role: "assistant", content: "" };
    messages = messages.concat(chunk_message);

    try {
        for await (let chunk of response.body) {
            chunk = chunk.toString()
            if (++chunk_index % 30 == 0) {
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
        }
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
    })
    // let test = await make_openai_request("models")
    // console.log("available openai models:", test.data.map(model => {
    //     let { id, owned_by, created } = { ...model };
    //     created = new Date(created * 1000).toISOString().split(".")[0];
    //     return { id, owned_by, created };
    // }));
});