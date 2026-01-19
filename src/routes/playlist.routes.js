import {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist,
} from "../controllers/playlist.controller.js"

import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"


const router = Router()

router.use(verifyJWT)
router.route("/create-playlist").post(createPlaylist)
router.route("/user/:userId").get(getUserPlaylists)
router.route("/add-video-playlist/:playlistId/:videoId").post(addVideoToPlaylist)
router.route("/remove-from-playlist/:playlistId/:videoId").delete(removeVideoFromPlaylist)
router.route("/:playlistId")
    .get(getPlaylistById)
    .patch(updatePlaylist)
    .delete(deletePlaylist)
export default router
