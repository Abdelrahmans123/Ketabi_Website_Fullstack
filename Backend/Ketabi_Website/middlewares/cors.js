import cors from "cors";
export const defineCors = (app) => {
    const whitelist = [process.env.CLIENT_URL];
    const corsOptions = {
        origin: function (origin, callback) {
            if (whitelist.indexOf(origin) !== -1 || !origin) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        // origin: "*",
        credentials: true,
    };
    app.use(cors(corsOptions));
};
