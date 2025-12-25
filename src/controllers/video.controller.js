import mongoose, { isValidObjectId, Types } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import Fuse from "fuse.js"

const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    page = parseInt(page), limit = parseInt(limit), sortType = parseInt(sortType)
    //TODO: get all videos based on query, sort, pagination

    // I will be using fuse.js fo rfuzzy finding
    // since my application is small scale, i will do some dumb shit

    // first get all video documents
    // then sort by views and duration
    // sortBy will be a string: "views" || "duration" , depending on these , sort using sortType: 1 or -1
    // now apply pagination

    const allVideos = await Video.find({})

    const options = {
        includeScore: true,
        keys: ['title']
    }
    const fuse = new Fuse(allVideos, options)
    const result = fuse.search(query)

    if (!result)
        throw new ApiError(409, "Failed to fuzzy find")
    if (sortBy === "views") {
        result.sort(
            function (a, b) {
                return sortType === 1 ? a.item.views - b.item.views : b.item.views - a.item.views
            }
        )
    }
    if (sortBy === "duration") {
        result.sort(
            function (a, b) {
                return sortType === 1 ? a.item.duration - b.item.duration : b.item.duration - a.item.duration
            }
        )
    }

    const paginatedResults = {}
    let startIndex = (page - 1) * limit, endIndex = startIndex + limit

    paginatedResults.results = result.slice(startIndex, endIndex)

    if (startIndex > 0) {
        paginatedResults.prev = {
            page: page - 1,
            limit: limit
        }
    }
    if (endIndex < result.length) {
        paginatedResults.next = {
            page: page + 1,
            limit: limit
        }
    }


    return res
        .status(200)
        .json(
            new ApiResponse(200, paginatedResults, "Fetched videos succesfully")
        )

})

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video

    // get the title , desc from the req body
    // video, thumbnail upload file local url available in req.files via multer
    // if we dont get any of these , return an error message
    // upload the video and thumbnail onto cloudinary, retrieve: duration
    // if cloudinary urls or duration are not ibtained, return an error message
    // now we have everything, instatiate a new video document and save to db

    const id = req.user?._id
    if (!id)
        throw new ApiError(409, "Login to upload a video")

    console.log(typeof req.body.title);
    const { title, description } = req.body

    if ([title, description].some((field) => field?.trim() === ""))
        throw new ApiError(409, "Title or description cannot be empty")

    const localVideoPath = req.files?.videoFile[0]?.path
    const localThumbnailPath = req.files?.thumbnail[0]?.path

    if ([localVideoPath, localThumbnailPath].some((field) => field?.trim() === ""))
        throw new ApiError(409, "Video and thumbnail are compulsory inputs")

    const vidCloudinaryUrl = await uploadOnCloudinary(localVideoPath)
    const thumbnailCloudinaryUrl = await uploadOnCloudinary(localThumbnailPath)

    if (!vidCloudinaryUrl)
        throw new ApiError(500, "Failed to upload video")
    if (!thumbnailCloudinaryUrl)
        throw new ApiError(500, "Failed to upload thumbnail")

    const duration = vidCloudinaryUrl.duration
    const video = await Video.create({
        videoFile: vidCloudinaryUrl.url,
        thumbnail: thumbnailCloudinaryUrl.url,
        duration: duration,
        title: title,
        description: description,
        views: 0,
        idPublished: true,
        owner: id,
    })

    if (!video)
        throw new ApiError(400, "Failed to upload video in database")

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Video uploaded succesfully")
        )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId)
        throw new ApiError(400, "Video ID is required")
    //TODO: get video by id
    // views are increemented here
    // handled views increment by adding a pre hook in the Video model

    // get the actual video which can be played
    // what we will easily get with above is: TITLE, DESCR , TIME SINCE UPLOADED , OWNER , VIEWS
    // what we have to fetch: `followers` of owner , `likes` of current video , is logged in user subscribed to profile he is viewing
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    const pipeline = [
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            _id: 1,
                        }
                    },
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [new mongoose.Types.ObjectId(req.user?._id), "$subscribers.subscriber"]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $unwind: "$owner"  // Converts owner from [{}] to {}
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            _id: 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                            subscribers: 1
                        }
                    }
                ]
            },

        },
        {
            $project: {
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                owner: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,

            }
        }
    ]

    if (!pipeline)
        throw new ApiError(404, "Syntax error while i was making pipeline")

    const video = await Video.aggregate(pipeline)

    if (!video)
        throw new ApiError(409, "Failed to fetch the video")

    return res
        .status(200)
        .json(
            new ApiResponse(200, video[0], "Video fetched succesfully")
        )

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    // get : title , descr , thumbnail 
    // make sure all fields are there
    // update those fields
    // return the updated doc

    const { title: newTitle, description: newDescription, thumbnail } = req.body

    if ([newTitle, newDescription].some((field) => field?.trim() === ""))
        throw new ApiError(408, "Title or Description cannot be empty")

    const localThumbnailPath = req.file?.thumbnail[0]?.path

    if (!localThumbnailPath)
        throw new ApiError(409, "Thumbnail is required")

    const cloudinaryThumbnail = await uploadOnCloudinary(localThumbnailPath)

    if (!cloudinaryThumbnail)
        throw new ApiError(409, "Failed to upload video")

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: newTitle,
                description: newDescription,
                thumbnail: cloudinaryThumbnail?.url
            }
        },
        {
            new: true
        }
    )

    if (!updatedVideo)
        throw new ApiError(409, "Failed to update video in database")

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedVideo, "Updated video details succesfully")
        )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!videoId)
        throw new ApiError(409, "Video does not exist")

    await Video.findByIdAndDelete(videoId)

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Video deleted succesfully")
        )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId)
        throw new ApiError(400, "Video ID is required")

    const video = await Video.findById(videoId)
    if (!video)
        throw new ApiError(404, "Video not found")

    video.isPublished = !video.isPublished
    await video.save()

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, `Video ${video.isPublished ? "published" : "unpublished"} successfully`)
        )
})

export {
    getAllVideos,           // DONE
    publishAVideo,          // DONE
    getVideoById,           // DONE
    updateVideo,            // DONE
    deleteVideo,            // DONE
    togglePublishStatus     // DONE
}