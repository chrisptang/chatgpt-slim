import { Configs } from "./database-models.js"

const DEFAUL_OPENAI_MODEL = process.env.DEFAUL_OPENAI_MODEL || "gpt-3.5-turbo-0301";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const HTTP_PROXY = process.env.HTTP_PROXY;

let config = { DEFAUL_OPENAI_MODEL, OPENAI_API_KEY, HTTP_PROXY };
console.log("system default config list:", JSON.stringify(config));
let init = false;

function setUpSysConfig(app) {
    app.get("/api/config", async (req, res) => {
        let config_list = await Configs.findAll();
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

async function getConfig() {
    if (!init) {
        await initConfig();
        init = true;
    }

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

export { setUpSysConfig, getConfig }