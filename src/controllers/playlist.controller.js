import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    //TODO: create playlist

    if (!name)
        throw new ApiError(409, "Missing name or description")

    const playlist = await Playlist.create({
        name: name,
        description: description || "",
        videos: [],
        owner: new mongoose.Types.ObjectId(req.user?._id) || ""
    })

    if (!playlist)
        throw new ApiError(409, "Failed to create playlist")

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "Playlist created succesfully")
        )

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlists

    if (!userId || !isValidObjectId(userId))
        throw new ApiError(409, "Invalid playlist id or the playlist does not exist")

    const playlists = await Playlist.find({
        owner: userId
    })

    if (!playlists.length)
        throw new ApiResponse(409, {}, "No playlists of user found")

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlists, "Playlists fetched succesfully")
        )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id

    // a very interesting pipeline will be written here

    // STEPS:
    // add a sub pipeline for every video ObjectId in the videos array
    // in that sub pipeline, project all the video details
    // within that sub pipeline, add another sub pipeline to get the channel name and info instead of the id of channel

    if (!playlistId || !isValidObjectId(playlistId))
        throw new ApiError(409, "Invalid playlist id or the playlist does not exist")

    const pipeline = [
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            },
            pipeline: [
                // now lookup the username from `owner` field and add username, fullname, avatar
                {
                    $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "channelInfo"
                    },
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                avatar: 1,
                                fullName: 1
                            }
                        }
                    ]
                }
            ]
        },
        {
            $project: {
                _id: 1,
                thumbnail: 1,
                title: 1,
                videoUrl: 1,
                views: 1,
                createdAt: 1,
                updatedAt: 1,
                channelInfo: 1
            }
        }
    ]

    const playlist = await Playlist.aggregate(pipeline)

    if (!playlist)
        throw new ApiError(409, "Failed to fetch playlist")

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "playlist fetched succesfully")
        )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId))
        throw new ApiError(409, "Invalid playlist id or invalid video id")

    const addToPlayList = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: { videos: new mongoose.Types.ObjectId(videoId) }
        }
    )

    if (!addToPlayList)
        throw new ApiError(400, "Faile dto add the video to playlist")

    return res
        .status(200)
        .json(
            new ApiResponse(200, addToPlayList, "Video succesfully added to playlist")
        )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist

    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId))
        throw new ApiError(409, "Invalid playlist id or invalid video id")

    const removed = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: new mongoose.Types.ObjectId(videoId)
            }
        }
    )

    if (!removed)
        throw new ApiError(400, "Faile dto delete the video from playlist")

    return res
        .status(200)
        .json(
            new ApiResponse(200, removed, "Video succesfully removed to playlist")
        )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist
    if (!playlistId || !isValidObjectId(playlistId))
        throw new ApiError(409, "Invalid playlist id or the playlist does not exist")

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)

    if (!deletedPlaylist)
        throw new ApiError(409, "Failed to delete video from playlist")

    return res
        .status(200)
        .json(
            new ApiResponse(200, deletedPlaylist, "playlist fetched succesfully")
        )

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId))
        throw new ApiError(409, "Invalid playlist id or invalid video id")

    if (!name)
        throw new ApiError(409, "Missing name or description")

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
        name:name,
        description:description || ""
    })

    if (!updatedPlaylist)
        throw new ApiError(409, "Failed to update playlist")

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedPlaylist, "playlist updated succesfully")
        )

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}