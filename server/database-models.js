import { Sequelize } from 'sequelize';

const pg_user = process.env.PG_USER || 'postgres'
    , pg_password = process.env.PG_PASSWORD || 'postgres-local'
    , pg_host = process.env.PG_HOST || 'db-postgres'
    , pg_port = process.env.PG_PORT || 5432
    , pg_db = process.env.PG_DB || 'chatgpt';

const pd_url = `postgres://${pg_user}:${pg_password}@${pg_host}:${pg_port}/${pg_db}`;

let database = null;
if ('true' === process.env.USE_SQLITE) {
    database = new Sequelize({
        dialect: 'sqlite',
        storage: '/app/data/sqlite/chat_db_file'
    });
    console.log("\n\nusing sqlite as databse:");
} else {
    database = new Sequelize(pd_url);
}


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

// Dialogues messages=[
//     {"role": "system", "content": "You are a helpful assistant."},
//     {"role": "user", "content": "Who won the world series in 2020?"},
//     {"role": "assistant", "content": "The Los Angeles Dodgers won the World Series in 2020."},
//     {"role": "user", "content": "Where was it played?"}
// ]

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

export { Chats, Dialogues, Users, sync_database }