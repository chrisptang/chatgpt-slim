import { Sequelize, Op, json } from 'sequelize';

const pg_user = process.env.PG_USER || 'postgres'
    , pg_password = process.env.PG_PASSWORD || 'postgres-local'
    , pg_host = process.env.PG_HOST || 'db-postgres'
    , pg_port = process.env.PG_PORT || 5432
    , pg_db = process.env.PG_DB || 'chatgpt';

const pd_url = `postgres://${pg_user}:${pg_password}@${pg_host}:${pg_port}/${pg_db}`

const database = new Sequelize(pd_url);

const Chats = database.define('chat_records', {
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

// Dialogues messages=[
//     {"role": "system", "content": "You are a helpful assistant."},
//     {"role": "user", "content": "Who won the world series in 2020?"},
//     {"role": "assistant", "content": "The Los Angeles Dodgers won the World Series in 2020."},
//     {"role": "user", "content": "Where was it played?"}
// ]

const Dialogues = database.define('dialogues', {
    title: Sequelize.STRING,
    messages: Sequelize.STRING,
    user: Sequelize.STRING
}, {
    paranoid: true,
    indexes: [{
        name: "idx_created_at",
        unique: false,
        fields: ["createdAt"]
    }]
});

function sync_database(callback) {
    database.sync({ force: false }).then(callback);
}

export { Chats, Dialogues, sync_database }