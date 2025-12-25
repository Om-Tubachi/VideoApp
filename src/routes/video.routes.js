import {
    publishAVideo,
    getAllVideos,
    deleteVideo,
    updateVideo,
    getVideoById
} from "../controllers/video.controller.js"

import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { upload } from "../middlewares/multer.middleware.js"
import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"


const videoRouter = Router()

videoRouter.route("/").get(getAllVideos)
videoRouter.route("/:videoId").get(getVideoById)

videoRouter.use(verifyJWT)
videoRouter.route("/update/:videoId")
.patch(
    
    upload.single([
        {
            name:"thumbnail",
            maxCount:1
        }
    ]),
    updateVideo
)
videoRouter.route("/delete/:videoId").delete(deleteVideo)
videoRouter.route("/publish").post(
    
    upload.fields([
        {
            name:"thumbnail",
            maxCount:1
        },
        {
            name:"videoFile",
            maxCount:1,
            limits: { fileSize: 1024 * 1024 * 300 } 
        },
    ]),
    publishAVideo
)

export default videoRouter