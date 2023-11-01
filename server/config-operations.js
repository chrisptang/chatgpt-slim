import { Configs } from "./database-models.js"

const DEFAUL_OPENAI_MODEL = process.env.DEFAUL_OPENAI_MODEL || "gpt-3.5-turbo-0301";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const HTTP_PROXY = process.env.HTTP_PROXY;

const USE_PROXY = process.env.USE_PROXY || 'true';
const USE_AZURE = process.env.USE_AZURE || 'false';
const MAX_GEN_TOKENS = process.env.MAX_GEN_TOKENS || '2048';
const USE_SYSTEM_PROMPT = process.env.USE_SYSTEM_PROMPT || 'false';
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || 'You are a helpful AI assistant. During the conversation, you should always give helpful, detailed, and polite answers to the user\'s questions';
const AZURE_RESOURCE_NAME = process.env.AZURE_RESOURCE_NAME || '';
const AZURE_DEPLOYMENT_NAME = process.env.AZURE_DEPLOYMENT_NAME || '';
const AZURE_API_VERSION = process.env.AZURE_API_VERSION || '2023-05-15';
const AZURE_API_KEY = process.env.AZURE_API_KEY || '';
const OPENAI_API_HOST = process.env.OPENAI_API_HOST || '';

let config = {
    USE_SYSTEM_PROMPT, SYSTEM_PROMPT, DEFAUL_OPENAI_MODEL, OPENAI_API_KEY, HTTP_PROXY, USE_AZURE, MAX_GEN_TOKENS,
    USE_PROXY, AZURE_API_VERSION, AZURE_DEPLOYMENT_NAME, AZURE_RESOURCE_NAME, AZURE_API_KEY, OPENAI_API_HOST
};
console.log("system default config list:", JSON.stringify(config));
let init = false;

function setUpSysConfig(app) {
    app.get("/api/config", async (req, res) => {
        let config_list = await Configs.findAll({
            order: [['id', 'DESC']]
        });
        res.json(config_list);
    });

    app.post('/api/config/:config_name', async (req, res) => {
        let config_name = req.params.config_name,
            config_value = req.query.value;
        let has_one = await Configs.findOne({ where: { config_name } });
        console.log("has_one:", JSON.stringify(has_one))
        if (has_one) {
            let config_name = req.params.config_name;
            await Configs.update({ config_value }, { where: { config_name } });
        } else {
            await Configs.create({ config_value, config_name });
        }
        config[config_name] = config_value;
        has_one = await Configs.findOne({ where: { config_name } });
        config = await initConfigFromDb();
        res.json(has_one)
    });
}

async function initConfig() {
    let config_list = await Configs.findAll();
    if (!config_list || config_list.length <= 0) {
        // 初始化数据库记录
        let config_list = [];
        for (let key of Object.keys(config)) {
            config_list[config_list.length] = { config_name: key, config_valye: config[key] };
        }
        await Configs.bulkCreate(config_list);
        init = true;
        return;
    }
}

async function initConfigFromDb() {
    let config_list = await Configs.findAll();
    let config_from_db = {};
    for (let conf of config_list) {
        if (conf.config_value) {
            //console.log("conf.config_name:", conf.config_name, "conf.config_value", conf.config_value);
            config_from_db[conf.config_name] = conf.config_value;
        }
    }

    console.log("config_from_db:", JSON.stringify(config_from_db));
    return config_from_db;
}

async function getConfig() {
    if (!init) {
        await initConfig();
        init = true;

        config = await initConfigFromDb();
    }

    return config;
}

export { setUpSysConfig, getConfig }