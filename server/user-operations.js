import { Users } from "./database-models.js"
import cookieParser from "cookie-parser";
import HttpsProxyAgent from "https-proxy-agent";
import fetch from 'node-fetch';

// This assumes that you have already created a GitHub OAuth app and have the app ID and secret
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const NEED_AUTH = !!GITHUB_CLIENT_ID && `0${GITHUB_CLIENT_ID}`.length > 5;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const PORT = process.env.PORT || "8081";
const GITHUB_LOGIN_CALLBACK_HOST = process.env.GITHUB_LOGIN_CALLBACK_HOST;
let callback_host = GITHUB_LOGIN_CALLBACK_HOST || `localhost:${PORT}`
const GITHUB_CALLBACK_URL = `http://${callback_host}/auth/github/callback`;

console.log("GITHUB_CALLBACK_URL:", GITHUB_CALLBACK_URL);

const AUTH_ALLOWED_PATHS = /^(\/login\/)|(^\/auth\/)/g;
const github_login = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_CALLBACK_URL)}`;

// returns only the response
async function fetchGithubApi(url, access_token = "", method = "get") {
    let conf = { method }
    let headers = {
        "Accept": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
    };
    if (access_token && access_token.length > 10) {
        headers["Authorization"] = `Bearer ${access_token}`;
    }
    conf.headers = headers;
    if (process.env.HTTP_PROXY && process.env.HTTP_PROXY.length > 10) {
        conf.agent = new HttpsProxyAgent(process.env.HTTP_PROXY);
        console.log("using proxy:", conf.agent);
    }

    return await fetch(url, conf);
}

function setupLoginWithGithub(app) {

    console.log("\n\nNEED_AUTH:", NEED_AUTH);

    app.use(cookieParser());

    function return401(res, message = null) {
        if (!res.headersSent) {
            console.log("github_login:", github_login)
            res.status(401).send(message ? message : JSON.stringify({ login: github_login }));
            res.end();
        }
        return;
    }

    // auth check middleware:
    app.use('/api/*', async (req, res, next) => {
        if (!NEED_AUTH) {
            console.warn("working in no-auth mode");
            req.user = { login: "default-user" };
            next();
            return;
        }
        try {
            let { token } = { ...req.cookies };
            if (!token) {
                console.log("user not found on session:", req.url, token);
                // user is not authenticated, redirect to login page
                return return401(res);
            } else {
                let user = await Users.findOne({ where: { access_token: token } });
                if (user) {
                    req.user = JSON.parse(user.api_response);
                } else {
                    console.error("can not find user for token:", token, "forcing user to relogin");
                    res.clearCookie("token");
                    return return401(res);
                }
            }
            if (typeof req.user === "string") {
                req.user = JSON.parse(req.user);
            }
            console.log("user:", typeof req.user, req.user);
            next();
        } catch (err) {
            console.log("handle request failed:", req.url, err.message, err.stack)
            if (!res.headersSent) {
                res.status(500).send(JSON.stringify({ error: true, message: err.message }));
            }
            next(err);
        }
    });

    app.get("/api/me", async (req, res) => {
        let access_token = req.cookies.token, user = req.user;
        if (!user) {
            user = await Users.findOne({ where: { access_token } });
            if (!user) {
                user = {};
            } else {
                user = JSON.parse(user.api_response);
            }
        }
        res.json(user);
    });

    app.get('/auth/github/callback', async (req, res) => {
        try {
            let code = req.query.code;
            if (!code) {
                res.send("invalid response:" + req.query);
                return;
            }

            let url = `https://github.com/login/oauth/access_token?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&code=${code}`;
            let resposne = await fetchGithubApi(url, null, 'post');
            let api_response = await resposne.text()
            console.error("exchange for token http code:", resposne.status, api_response);
            if (resposne.status != 200) {
                res.send("failed to login with github.");
                return;
            }
            let { access_token, scope, token_type } = { ...JSON.parse(api_response) };
            if (!access_token) {
                res.send("invalid response:" + req.query);
                return;
            }
            console.log("access_token acquired:", access_token.substring(0, 10));

            resposne = await fetchGithubApi("https://api.github.com/user", access_token, 'get');

            api_response = await resposne.text()
            console.error("http code:", resposne.status, api_response);
            if (resposne.status != 200) {
                res.send("invalid response:" + api_response);
                return;
            }

            let { name, email, login, avatar_url } = { ...JSON.parse(api_response) };

            let user = await Users.findOne({ where: { login } });
            if (!user) {
                user = await Users.findOne({ where: { email } });
            }

            if (!user) {
                user = await Users.create({ email, name, login, access_token, api_response });
            } else {
                await Users.update({ name, access_token, api_response: JSON.stringify(api_response) }, { where: { login } });
            }
            console.log("send access_token:", access_token)
            res.cookie("token", access_token, { httpOnly: true, maxAge: 1000 * 3600 * 24 * 30 });
            res.redirect("/");
        } catch (err) {
            console.error(err.message, err.stack);
            if (!res.headersSent) {
                res.status(500).send(err.message);
                res.end();
            }
        }
    });
}

export { setupLoginWithGithub, AUTH_ALLOWED_PATHS }