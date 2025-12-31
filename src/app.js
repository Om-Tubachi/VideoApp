import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// import routes
import userRouter from "./routes/user.routes.js"
import videRouter from "./routes/video.routes.js" 
import commentRouter from "./routes/comment.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import healthcheckRouter from "./routes/healthcheck.routes.js"
import likesRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import subsciptionRouter from "./routes/subscription.routes.js"
import tweetRouter from "./routes/tweet.routes.js"

app.use("/api/users" , userRouter)
app.use("/api/video" , videRouter)
app.use("/api/comments", commentRouter)
app.use("/api/dashboard", dashboardRouter)
app.use("/api/health-check", healthcheckRouter)
app.use("/api/like", likesRouter)
app.use("/api/playlist", playlistRouter)
app.use("/api/subscription", subsciptionRouter)
app.use("/api/tweet", tweetRouter)


// http://localhost:8000/api/v1/users/register

export { app }