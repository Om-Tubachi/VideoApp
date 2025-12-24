import mongoose, { isValidObjectId, Types } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
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

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId)
        throw new ApiError(400, "Video ID is required")
    
    const video = await Video.findById(videoId)
    if(!video)
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
    getAllVideos,
    publishAVideo,          // DONE
    getVideoById,           // DONE
    updateVideo,
    deleteVideo,
    togglePublishStatus     // DONE
}