import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import finale from 'finale-rest';
import fetch from 'node-fetch';
import { Sequelize, Op } from 'sequelize';
import { createServer } from 'http';
import { Configuration, OpenAIApi } from "openai";
import HttpsProxyAgent from "https-proxy-agent";

let app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

console.log("about to start new chatgpt server with key:", (process.env.OPENAI_API_KEY || "0000000000").substring(0, 10));

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});

async function make_openai_request(path, data) {
    const headers = {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
    };
    const postJson = { headers }
    if (process.env.HTTP_PROXY) {
        postJson.agent = new HttpsProxyAgent(process.env.HTTP_PROXY);
        console.log("using proxy:", postJson);
    }
    let url = `https://api.openai.com/v1/${path}`
    console.log("making request to:", url)
    if (!data) {
        //GET
        let resposne = await fetch(url, postJson)
        return await resposne.json();
    } else {
        //POST as json
        postJson.method = "POST";
        postJson.body = JSON.stringify(data);
        let resposne = await fetch(url, postJson);
        return await resposne.json();
    }
}

let test = await make_openai_request("models")
console.log("test openai:", test);

const openai = new OpenAIApi(configuration);

const static_path = process.env.SERVER_STATIC_PATH || '../dist';
app.use(express.static(static_path))

const server = createServer(app);

const pg_user = process.env.PG_USER || 'postgres'
    , pg_password = process.env.PG_PASSWORD || 'postgres-local'
    , pg_host = process.env.PG_HOST || 'db-postgres'
    , pg_port = process.env.PG_PORT || 5432
    , pg_db = process.env.PG_DB || 'chatgpt';

const pd_url = `postgres://${pg_user}:${pg_password}@${pg_host}:${pg_port}/${pg_db}`

const database = new Sequelize(pd_url);

let Chats = database.define('chat_records', {
    ref_id: Sequelize.BIGINT,
    propmt: Sequelize.STRING,
    response: Sequelize.STRING,
    create_time: Sequelize.DATE,
    type: Sequelize.STRING
}, {
    paranoid: true,
    indexes: [{
        name: "idx_create_time",
        unique: false,
        fields: ["create_time"]
    }]
});

// Initialize finale
finale.initialize({
    app: app,
    sequelize: database
})

// Create the dynamic REST resource for our Post model
let chatResources = finale.resource({
    model: Chats,
    endpoints: ['/api/chats', '/api/chats/:id']
})

function randomSeqId() {
    return parseInt(new Date().getTime() + "" + Math.floor(Math.random() * 999 + 1000));
}

app.post('/api/newChat', async (req, res) => {
    let model = req.body.model || "gpt-3.5-turbo-0301";
    let propmt = req.body.propmt;
    let data = {
        model: model,
        messages: [{ role: "user", content: propmt }]
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

app.get('/api/chat-list', async (req, res) => {
    let date_list = await Chats.findAll({
        attributes: [
            [Sequelize.fn('DISTINCT', Sequelize.col('create_time')), 'create_time'],
        ]
    })
    res.write(JSON.stringify(date_list));
    res.end();
});

const port = parseInt(process.env.PORT || "8081")

database
    .sync({ force: false })
    .then(() => {
        app.listen(port, () => {
            console.log(`listening to port localhost:${port}`)
        })
    })