import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { Chats, sync_database } from "./database-models.js"
import { createServer } from 'http';
import HttpsProxyAgent from "https-proxy-agent";

let app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

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
        let resposne = await fetch(url, postJson);
        return await resposne.json();
    }
    let resposne = await fetch(url, postJson);
    if (resposne.status != 200) {
        console.error("error code:", resposne.status, await resposne.text());
        return {};
    }
    return await resposne.json();
}

let test = await make_openai_request("models")
console.log("test openai:", test);

const static_path = process.env.SERVER_STATIC_PATH || '../dist';
app.use(express.static(static_path))

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
    let model = req.body.model || "gpt-3.5-turbo-0301";
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

app.get('/api/chats/:id', async (req, res) => {
    let id = req.params.id
    let recod = await Chats.findOne({ where: { id: id } })
    res.json(recod);
});

const port = parseInt(process.env.PORT || "8081")

sync_database(() => {
    app.listen(port, () => {
        console.log(`listening to port localhost:${port}`)
    })
});