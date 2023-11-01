import { Sequelize } from 'sequelize';

const pg_user = process.env.PG_USER || 'postgres'
    , pg_password = process.env.PG_PASSWORD || 'postgres-local'
    , pg_host = process.env.PG_HOST || 'db-postgres'
    , pg_port = process.env.PG_PORT || 5432
    , pg_db = process.env.PG_DB || 'chatgpt';

const pd_url = `postgres://${pg_user}:${pg_password}@${pg_host}:${pg_port}/${pg_db}`;

let database = null;
if ('true' === process.env.USE_SQLITE) {
    let sqliteDir = process.env.SQLITE_DIR || '/app/data/sqlite';
    database = new Sequelize({
        dialect: 'sqlite',
        storage: `${sqliteDir}/chat_db_file`
    });
    console.log(`using sqlite as databse:${process.env.SQLITE_DIR}`);
} else {
    database = new Sequelize(pd_url);
}

const Configs = database.define('sys_configs', {
    config_name: Sequelize.STRING(255),
    config_value: Sequelize.TEXT
}, {
    paranoid: true,
    indexes: [{
        name: "idx_config_name",
        unique: true,
        fields: ["config_name"]
    }]
});


const Chats = database.define('chat_records', {
    ref_id: Sequelize.BIGINT,
    propmt: Sequelize.TEXT,
    response: Sequelize.TEXT,
    create_time: Sequelize.DATE,
    type: Sequelize.STRING,
    user: {
        type: Sequelize.STRING(255),
        defaultValue: "default-user"
    }
}, {
    paranoid: true,
    indexes: [{
        name: "idx_create_time",
        unique: false,
        fields: ["create_time"]
    }, {
        name: "idx_user",
        unique: false,
        fields: ["user"]
    }]
});

const Users = database.define('users', {
    email: Sequelize.STRING(255),
    name: Sequelize.STRING(255),
    login: Sequelize.STRING(255),
    is_admin: Sequelize.STRING(32),
    enable: Sequelize.STRING(32),
    access_token: Sequelize.TEXT,
    api_response: Sequelize.TEXT
}, {
    paranoid: true,
    indexes: [{
        name: "idx_email",
        unique: false,
        fields: ["email"]
    }, {
        name: "idx_login",
        unique: false,
        fields: ["login"]
    }]
});

const Dialogues = database.define('dialogues', {
    title: Sequelize.STRING(512),
    messages: Sequelize.TEXT,
    user: {
        type: Sequelize.STRING(255),
        defaultValue: "default-user"
    }
}, {
    paranoid: true,
    indexes: [{
        name: "idx_created_at",
        unique: false,
        fields: ["createdAt"]
    }, {
        name: "idx_user_2",
        unique: false,
        fields: ["user"]
    }]
});

function sync_database(callback) {
    database.sync({ force: false, alter: true }).then(callback);
}

export { Chats, Dialogues, Users, Configs, sync_database }