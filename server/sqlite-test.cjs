const Sequelize = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './app/data/sqlite'
});

const { DataTypes } = require('sequelize');

const User = sequelize.define('User', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

async function run() {
    await sequelize.sync();
    console.log('Database synced!');

    await User.create({
        name: 'John Doe',
        email: 'johndoe@example.com'
    });

    const users = await User.findAll();
    console.log(users);
}

run();