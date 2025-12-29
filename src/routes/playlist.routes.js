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


const playlistRouter = Router()

playlistRouter.use(verifyJWT)
playlistRouter.route("/add-video-playlist/:playlistId/:videoId").post(addVideoToPlaylist)
playlistRouter.route("/create-playlist").post(createPlaylist)
playlistRouter.route("/delete-playlist/:playlistId").post(deletePlaylist)
playlistRouter.route("/playlist/:playlistId").get(getPlaylistById)
playlistRouter.route("/playlists/:userId").get(getUserPlaylists)
playlistRouter.route("/remove-from-playlist/:playlistId/:videoId").get(removeVideoFromPlaylist)
playlistRouter.route("/update-playlist/:playlistId").patch(updatePlaylist)

export default playlistRouter
