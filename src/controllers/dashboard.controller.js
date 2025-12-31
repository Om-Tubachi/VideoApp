import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const userId = req.user?._id

    // total views: 
    // match userId in videos collection where owner = userID
    // we have all vidDocs, in that accumulate all the views per vidDoc

    // total subscribers:
    // match userId in subscriptions collection where channel = userId
    // count all returned docs

    // total likes:
    // match all videos in videos collection with owner = userId
    // extract all those videoIds 
    // in likes collection, count number of likeDocs per videoId

    const pipeline = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "dislikes",
                localField: "_id",
                foreignField: "video",
                as: "dislikes"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" },
                totalLikes: { $sum: { $size: "$likes" } },
                totalDislikes: { $sum: { $size: "$dislikes" } },
                totalSubscribers: { $first: { $size: "$subscribers" } }
            }
        },
        {
            $project: {
                _id: 0,
                totalVideos: 1,
                totalViews: 1,
                totalLikes: 1,
                totalDislikes: 1,
                totalSubscribers: 1
            }
        }
    ]

    const stats = await Video.aggregate(pipeline)

    if (!stats || stats.length === 0)
        throw new ApiError(404, "Failed to fetch channel stats")

    return res
        .status(200)
        .json(
            new ApiResponse(200, stats[0], "Channel stats fetched successfully")
        )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const userId = req.user?._id
    const pipeline = [
        {
            owner: new mongoose.Types.ObjectId(userId)
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "dislikes",
                localField: "_id",
                foreignField: "video",
                as: "dislikes"
            }
        },
        {
            $addFields: {
                likes: { $size: "$likes" },
                dislikes: { $size: "$dislikes" },
            }
        },
        {
            $project: {
                _id: 1,
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                views: 1,
                isPublished: 1,
                likes: 1,
                dislikes: 1,
            }
        }
    ]

    const videos = await Video.aggregate(pipeline)

    if (!videos)
        throw new ApiError(409, "Failed to fetch user videos")

    return res
        .status(200)
        .json(
            new ApiResponse(200, videos, "Videos and meta-data fetched succesfully")
        )
})

export {
    getChannelStats,
    getChannelVideos
}