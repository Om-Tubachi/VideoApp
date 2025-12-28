import {
    getVideoComments,
    addComment,
    deleteComment,
    updateComment,
} from "../controllers/comment.controller.js"

import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const commentRouter = Router()

commentRouter.route("/getComments/:videoId").get(getVideoComments)

commentRouter.use(verifyJWT)
commentRouter.route("/addComment/:videoId").post(addComment)
commentRouter.route("/updateComment/:commentId").patch(updateComment)
commentRouter.route("/deleteComment/:commentId").delete(deleteComment)

export default commentRouter