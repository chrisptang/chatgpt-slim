import { Users } from "./database-models.js"
import cookieParser from "cookie-parser";
import HttpsProxyAgent from "https-proxy-agent";
import fetch from 'node-fetch';

// Passport authentication setup
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

function setupLoginWithGithub(app) {

    console.log("\n\n:NEED_AUTH", NEED_AUTH);

    app.use(cookieParser());

    app.use(async (req, res, next) => {
        if (!NEED_AUTH) {
            console.warn("working in no-auth mode");
            req.user = { login: "default-user" };
            next();
            return;
        }
        try {
            if (!req.cookies.token) {
                console.log("user not found on session:", req.url);
                if (!`${req.url}`.match(AUTH_ALLOWED_PATHS)) {
                    // user is not authenticated, redirect to login page
                    res.status(401).send(JSON.stringify({ login: github_login }));
                    res.end();
                    return;
                }
            } else {
                let user = await Users.findOne({ where: { access_token: req.cookies.token } });
                if (user) {
                    req.user = JSON.parse(user.api_response);
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
                if (!res.headersSent) {
                    res.status(401).send(JSON.stringify({ login: github_login }));
                    return;
                }
            }
            user = JSON.parse(user.api_response);
        }
        res.json(user);
    });


    app.get('/auth/github/callback', async (req, res) => {
        try {
            let code = req.query.code;
            if (!code) {
                res.status(401).send("failed to login with github.");
                res.end();
                return;
            }
            let headers = {
                "Accept": "application/json",
            };
            const postJson = { headers, method: "post" };
            if (process.env.HTTP_PROXY) {
                postJson.agent = new HttpsProxyAgent(process.env.HTTP_PROXY);
                console.log("using proxy:", postJson.agent);
            }
            let url = `https://github.com/login/oauth/access_token?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&code=${code}`;
            let resposne = await fetch(url, postJson);
            let api_response = await resposne.text()
            console.error("exchange for token http code:", resposne.status, api_response);
            if (resposne.status != 200) {
                res.status(401).send("failed to login with github.");
                res.end();
                return;
            }
            let { access_token, scope, token_type } = { ...JSON.parse(api_response) };
            console.log("access_token acquired:", access_token.substring(0, 10));


            // https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
            // curl -L \
            //   -H "Accept: application/vnd.github+json" \
            //   -H "Authorization: Bearer <YOUR-TOKEN>"\
            //   -H "X-GitHub-Api-Version: 2022-11-28" \
            //   https://api.github.com/user
            headers = {
                "Accept": "application/json",
                "Authorization": `Bearer ${access_token}`,
                "X-GitHub-Api-Version": "2022-11-28"
            };

            resposne = await fetch("https://api.github.com/user", { method: "get", headers });

            api_response = await resposne.text()
            console.error("http code:", resposne.status, api_response);
            if (resposne.status != 200) {
                res.status(401).send("failed to fetch user info");
                res.end();
                return;
            }

            let { name, email, login } = { ...JSON.parse(api_response) };

            let user = await Users.findOne({ where: { login } });
            if (!user) {
                user = await Users.findOne({ where: { email } });
            }

            if (!user) {
                user = await Users.create({ email, name, login, access_token, api_response });
            } else {
                await Users.update({ name, access_token, api_response: JSON.stringify(api_response) }, { where: { login } });
            }
            res.cookie("token", access_token, { httpOnly: true, maxAge: 3600000 });
            res.redirect("/");
        } catch (err) {
            console.error(err.message, err.stack);
            res.status(500).send(err.message);
            res.end();
        }
    });
}

export { setupLoginWithGithub, AUTH_ALLOWED_PATHS }